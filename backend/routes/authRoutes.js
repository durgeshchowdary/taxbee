import express from 'express';
import { forgotPassword, login, logout, resendVerificationOtp, resetPassword, session, signup, verifyOtp } from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { authRateLimit } from '../middleware/securityMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.use(authRateLimit);

router.post(
  '/signup',
  validateBody({
    name: { type: 'string', required: true, max: 120 },
    email: { type: 'string', required: true, email: true, max: 254 },
    password: { type: 'string', required: true, max: 256 },
  }),
  signup
);
router.post(
  '/login',
  validateBody({
    email: { type: 'string', required: true, email: true, max: 254 },
    password: { type: 'string', required: true, max: 256 },
  }),
  login
);
router.post(
  '/verify-otp',
  validateBody({
    email: { type: 'string', required: true, email: true, max: 254 },
    otp: { type: 'string', required: true, pattern: /^\d{6}$/, max: 6 },
  }),
  verifyOtp
);
router.post(
  '/resend-verification',
  validateBody({
    email: { type: 'string', required: true, email: true, max: 254 },
  }),
  resendVerificationOtp
);
router.get('/session', requireAuth, session);
router.post('/logout', optionalAuth, logout);
router.post(
  '/forgot-password',
  validateBody({
    email: { type: 'string', required: true, email: true, max: 254 },
  }),
  forgotPassword
);
router.post(
  '/reset-password',
  validateBody({
    email: { type: 'string', required: true, email: true, max: 254 },
    token: { type: 'string', required: true, max: 256 },
    password: { type: 'string', required: true, max: 256 },
  }),
  resetPassword
);

export default router;
