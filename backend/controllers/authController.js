import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail.js';
import { fail } from '../utils/apiResponse.js';
import { logger } from '../utils/safeLogger.js';
import { getJwtAudience, getJwtIssuer } from '../utils/env.js';
import { createNotification } from '../services/notificationService.js';
import WorkspaceAccess from '../models/WorkspaceAccess.js';
import { isUserEmailVerified, markUserEmailVerified, verificationStateFor } from '../utils/emailVerification.js';
import { recordAuthAuditEvent, recordAuthFailureAudit } from '../services/authAuditService.js';

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const isProduction = () => process.env.NODE_ENV === 'production';

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(`${otp}${process.env.JWT_SECRET}`).digest('hex');

const createToken = (user) =>
  jwt.sign({ id: String(user._id), role: user.role || 'taxpayer', isVerified: isUserEmailVerified(user) }, process.env.JWT_SECRET, {
    expiresIn: '1d',
    algorithm: 'HS256',
    issuer: getJwtIssuer(),
    audience: getJwtAudience(),
  });

const authSecurity = {
  tokenStorage: 'Prefer a server-set HttpOnly Secure SameSite=Lax cookie in production; bearer tokens are retained for current API compatibility.',
  cookieFlags: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAgeSeconds: 24 * 60 * 60,
  },
};

const safeUser = (user) => {
  const verification = verificationStateFor(user);
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role || 'taxpayer',
    isVerified: verification.isVerified,
    isEmailVerified: verification.isEmailVerified,
  };
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(`${token}${process.env.JWT_SECRET}`).digest('hex');

const allowedPortalsFor = async (user) => {
  const role = user.role || 'taxpayer';
  const portals = new Set();

  const isVerified = isUserEmailVerified(user);

  if (isVerified && ['taxpayer', 'admin', 'internal'].includes(role)) {
    portals.add('taxpayer');
  }
  if (isVerified && ['reviewer', 'ca', 'admin', 'internal'].includes(role)) {
    portals.add('reviewer');
  }
  if (isVerified && ['admin', 'internal'].includes(role)) {
    portals.add('admin');
  }

  if (isVerified) {
    const acceptedWorkspace = await WorkspaceAccess.exists({
      status: 'accepted',
      $or: [{ reviewerUserId: user._id }, { reviewerEmail: user.email }],
    });
    if (acceptedWorkspace) portals.add('reviewer');
  }

  return Array.from(portals);
};

const defaultPortalFor = (portals = []) => {
  if (portals.includes('admin')) return 'admin';
  if (portals.includes('reviewer')) return 'reviewer';
  if (portals.includes('taxpayer')) return 'taxpayer';
  return 'verify-email';
};

export const buildSessionPayload = async (user) => {
  const allowedPortals = await allowedPortalsFor(user);
  const verification = verificationStateFor(user);
  return {
    user: safeUser(user),
    role: user.role || 'taxpayer',
    isVerified: verification.isVerified,
    allowedPortals,
    defaultPortal: defaultPortalFor(allowedPortals),
    requiresVerification: verification.requiresVerification,
  };
};

const sendVerificationOtp = async (user, { requestId } = {}) => {
  const otp = createOtp();
  user.otpHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  const delivery = await sendEmail(
    user.email,
    'Your TaxBee email verification OTP',
    `Your TaxBee email verification OTP is ${otp}. It expires in 10 minutes.`
  );

  if (delivery?.skipped) {
    logger.warn('verification_otp_email_not_sent', {
      requestId,
      userId: String(user._id),
      reason: 'email_provider_missing',
      devFallback: !isProduction(),
    });
  }

  return {
    emailSent: !delivery?.skipped,
    provider: delivery?.provider || 'unknown',
    message: delivery?.skipped
      ? isProduction()
        ? 'Verification OTP could not be emailed because the email provider is not configured. Contact support.'
        : 'Email provider is not configured. Development OTP is available below.'
      : 'OTP sent to your email.',
    ...(delivery?.skipped && !isProduction() ? { devOtp: otp } : {}),
  };
};

// Signup
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return fail(res, { status: 400, message: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return fail(res, { status: 400, message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return fail(res, { status: 400, message: 'Please enter a valid email address' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'signup_existing_user' });
      await recordAuthFailureAudit({
        userId: String(existingUser._id),
        eventType: 'auth_signup_failed',
        reason: 'signup_existing_user',
        requestId: req.requestId,
        metadata: { emailDomain: normalizedEmail.split('@')[1] || '' },
      });
      return fail(res, { status: 400, message: 'User already exists. Please login.' });
    }

    const user = await User.create({ name, email: normalizedEmail, password, role: 'taxpayer', isVerified: false });
    const otpDelivery = await sendVerificationOtp(user, { requestId: req.requestId });
    await recordAuthAuditEvent({
      userId: String(user._id),
      eventType: 'auth_signup',
      requestId: req.requestId,
      metadata: {
        emailDomain: normalizedEmail.split('@')[1] || '',
        requiresVerification: true,
        emailSent: otpDelivery.emailSent,
      },
    });

    res.status(201).json({
      success: true,
      message: otpDelivery.emailSent
        ? 'Account created successfully. OTP sent to your email.'
        : 'Account created successfully. Email verification is pending.',
      data: {
        email: normalizedEmail,
        requiresVerification: true,
        emailDelivery: {
          emailSent: otpDelivery.emailSent,
          provider: otpDelivery.provider,
          message: otpDelivery.message,
        },
        ...(otpDelivery.devOtp ? { devOtp: otpDelivery.devOtp } : {}),
      },
      email: normalizedEmail,
      requiresVerification: true,
      ...(otpDelivery.devOtp ? { devOtp: otpDelivery.devOtp } : {}),
    });
  } catch (error) {
    logger.error('signup error', error, { requestId: req.requestId });
    fail(res, { status: 500, message: 'Server error while creating account' });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return fail(res, { status: 400, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+otpHash +otpExpiresAt'
    );

    if (!user) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'otp_user_not_found' });
      await recordAuthFailureAudit({
        reason: 'otp_user_not_found',
        eventType: 'auth_verification_failed',
        requestId: req.requestId,
      });
      return fail(res, { status: 400, message: 'Invalid verification request' });
    }
    if (isUserEmailVerified(user)) return fail(res, { status: 400, message: 'First login is already verified' });
    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'otp_expired', userId: String(user._id) });
      await recordAuthFailureAudit({
        userId: String(user._id),
        eventType: 'auth_verification_failed',
        reason: 'otp_expired',
        requestId: req.requestId,
      });
      return fail(res, { status: 400, message: 'OTP expired. Please login again to get a new OTP.' });
    }
    if (user.otpHash !== hashOtp(otp)) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'otp_invalid', userId: String(user._id) });
      await recordAuthFailureAudit({
        userId: String(user._id),
        eventType: 'auth_verification_failed',
        reason: 'otp_invalid',
        requestId: req.requestId,
      });
      return fail(res, { status: 400, message: 'Invalid OTP' });
    }

    markUserEmailVerified(user);
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = createToken(user);
    const session = await buildSessionPayload(user);
    await recordAuthAuditEvent({
      userId: String(user._id),
      eventType: 'auth_email_verified',
      requestId: req.requestId,
    });

    res.status(200).json({
      success: true,
      message: 'First login verified successfully',
      data: {
        ...session,
        token,
        authSecurity,
      },
      user: session.user,
      token,
    });
  } catch {
    fail(res, { status: 500, message: 'Server error while verifying OTP' });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return fail(res, { status: 400, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'invalid_credentials' });
      await recordAuthFailureAudit({
        reason: 'invalid_credentials',
        eventType: 'auth_login_failed',
        requestId: req.requestId,
        metadata: { userFound: false },
      });
      return fail(res, { status: 400, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'invalid_credentials', userId: String(user._id) });
      await recordAuthFailureAudit({
        userId: String(user._id),
        eventType: 'auth_login_failed',
        reason: 'invalid_credentials',
        requestId: req.requestId,
        metadata: { userFound: true },
      });
      await createNotification({
        userId: String(user._id),
        recipientEmail: user.email,
        type: 'security_alert',
        title: 'Unsuccessful login attempt',
        message: 'TaxBee noticed an unsuccessful login attempt for your account. If this was not you, update your password and review account access.',
        metadata: { reason: 'invalid_credentials' },
        dedupeKey: `security-alert:${user._id}:invalid-credentials`,
        priority: 2,
      });
      return fail(res, { status: 400, message: 'Invalid credentials' });
    }

    if (!isUserEmailVerified(user)) {
      const otpDelivery = await sendVerificationOtp(user, { requestId: req.requestId });

      return res.status(403).json({
        success: false,
        message: otpDelivery.emailSent ? 'OTP sent to your email.' : otpDelivery.message,
        data: {
          requiresVerification: true,
          email: user.email,
          emailDelivery: {
            emailSent: otpDelivery.emailSent,
            provider: otpDelivery.provider,
            message: otpDelivery.message,
          },
          ...(otpDelivery.devOtp ? { devOtp: otpDelivery.devOtp } : {}),
        },
        requiresVerification: true,
        email: user.email,
        ...(otpDelivery.devOtp ? { devOtp: otpDelivery.devOtp } : {}),
      });
    }

    const token = createToken(user);
    const session = await buildSessionPayload(user);
    await recordAuthAuditEvent({
      userId: String(user._id),
      eventType: 'auth_login_success',
      requestId: req.requestId,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        ...session,
        token,
        authSecurity,
      },
      user: session.user,
      token,
    });
  } catch {
    fail(res, { status: 500, message: 'Server error while logging in' });
  }
};

export const resendVerificationOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return fail(res, { status: 400, message: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+otpHash +otpExpiresAt');
    if (!user) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'resend_user_not_found' });
      return fail(res, { status: 400, message: 'Invalid verification request' });
    }
    if (isUserEmailVerified(user)) {
      return fail(res, { status: 400, message: 'Email is already verified. Please login.' });
    }

    const otpDelivery = await sendVerificationOtp(user, { requestId: req.requestId });
    await recordAuthAuditEvent({
      userId: String(user._id),
      eventType: 'auth_verification_resent',
      requestId: req.requestId,
      metadata: { emailSent: otpDelivery.emailSent },
    });

    return res.status(200).json({
      success: true,
      message: otpDelivery.emailSent ? 'OTP sent to your email.' : otpDelivery.message,
      data: {
        requiresVerification: true,
        email: user.email,
        emailDelivery: {
          emailSent: otpDelivery.emailSent,
          provider: otpDelivery.provider,
          message: otpDelivery.message,
        },
        ...(otpDelivery.devOtp ? { devOtp: otpDelivery.devOtp } : {}),
      },
      ...(otpDelivery.devOtp ? { devOtp: otpDelivery.devOtp } : {}),
    });
  } catch (error) {
    logger.error('resendVerificationOtp error', error, { requestId: req.requestId });
    return fail(res, { status: 500, message: 'Server error while resending verification OTP' });
  }
};

export const session = async (req, res) => {
  try {
    if (!req.user?.id) {
      return fail(res, { status: 401, message: 'Authentication token is required', code: 'AUTH_REQUIRED' });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return fail(res, { status: 401, message: 'Invalid or expired authentication token', code: 'AUTH_INVALID' });
    }

    await recordAuthAuditEvent({
      userId: req.user.id,
      eventType: 'auth_session_restored',
      requestId: req.requestId,
    });

    return res.status(200).json({
      success: true,
      message: 'Session restored',
      data: await buildSessionPayload(user),
    });
  } catch {
    return fail(res, { status: 500, message: 'Server error while restoring session' });
  }
};

export const logout = async (req, res) => {
  if (req.user?.id) {
    await recordAuthAuditEvent({
      userId: req.user.id,
      eventType: 'auth_logout',
      requestId: req.requestId,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
      await sendEmail(
        user.email,
        'Reset your TaxBee password',
        `Use this secure link to reset your TaxBee password: ${clientOrigin}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}. It expires in 30 minutes.`
      );
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  } catch {
    return fail(res, { status: 500, message: 'Server error while requesting password reset' });
  }
};

export const resetPassword = async (req, res) => {
  const { email, token, password } = req.body;

  try {
    if (!password || String(password).length < 8) {
      return fail(res, { status: 400, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select(
      '+passwordResetTokenHash +passwordResetExpiresAt'
    );

    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date() ||
      user.passwordResetTokenHash !== hashToken(String(token || ''))
    ) {
      logger.warn('auth_failure', { requestId: req.requestId, reason: 'password_reset_invalid' });
      return fail(res, { status: 400, message: 'Invalid or expired password reset request' });
    }

    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login.',
    });
  } catch {
    return fail(res, { status: 500, message: 'Server error while resetting password' });
  }
};
