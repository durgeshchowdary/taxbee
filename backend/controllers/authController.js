import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail.js';

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
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists. Please login.' });
    }

    await User.create({ name, email: normalizedEmail, password, isVerified: false });

    res.status(201).json({
      message: 'Account created successfully. Please login to verify your first login OTP.',
      email: normalizedEmail,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+otpHash +otpExpiresAt'
    );

    if (!user) return res.status(400).json({ message: 'Invalid verification request' });
    if (user.isVerified) return res.status(400).json({ message: 'First login is already verified' });
    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please login again to get a new OTP.' });
    }
    if (user.otpHash !== hashOtp(otp)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = createToken(user);

    res.status(200).json({
      message: 'First login verified successfully',
      user: safeUser(user),
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      await sendVerificationOtp(user);

      return res.status(403).json({
        message: 'First login OTP sent to your email.',
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = createToken(user);

    res.status(200).json({ message: 'Login successful', user: safeUser(user), token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
