import express from 'express';
import { getUser, updateUser } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user info by ID
router.get('/:id', requireAuth, getUser);

// Update user info by ID
router.put('/:id', requireAuth, updateUser);

export default router;
