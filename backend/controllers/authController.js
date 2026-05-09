import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail.js';
import { fail } from '../utils/apiResponse.js';

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(`${otp}${process.env.JWT_SECRET}`).digest('hex');

const createToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
});

const sendVerificationOtp = async (user) => {
  const otp = createOtp();
  user.otpHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendEmail(
    user.email,
    'Your TaxBee first login OTP',
    `Your TaxBee first login OTP is ${otp}. It expires in 10 minutes.`
  );
};

// Signup
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return fail(res, { status: 400, message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return fail(res, { status: 400, message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return fail(res, { status: 400, message: 'Please enter a valid email address' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return fail(res, { status: 400, message: 'User already exists. Please login.' });
    }

    await User.create({ name, email: normalizedEmail, password, isVerified: false });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please login to verify your first login OTP.',
      data: {
        email: normalizedEmail,
      },
      email: normalizedEmail,
    });
  } catch {
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

    if (!user) return fail(res, { status: 400, message: 'Invalid verification request' });
    if (user.isVerified) return fail(res, { status: 400, message: 'First login is already verified' });
    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return fail(res, { status: 400, message: 'OTP expired. Please login again to get a new OTP.' });
    }
    if (user.otpHash !== hashOtp(otp)) {
      return fail(res, { status: 400, message: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = createToken(user);

    res.status(200).json({
      success: true,
      message: 'First login verified successfully',
      data: {
        user: safeUser(user),
        token,
      },
      user: safeUser(user),
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
    if (!user) return fail(res, { status: 400, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return fail(res, { status: 400, message: 'Invalid credentials' });

    if (!user.isVerified) {
      await sendVerificationOtp(user);

      return res.status(403).json({
        success: false,
        message: 'First login OTP sent to your email.',
        data: {
          requiresVerification: true,
          email: user.email,
        },
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = createToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser(user),
        token,
      },
      user: safeUser(user),
      token,
    });
  } catch {
    fail(res, { status: 500, message: 'Server error while logging in' });
  }
};
