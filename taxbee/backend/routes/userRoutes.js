import express from 'express';
import { getUser, updateUser } from '../controllers/userController.js';

const router = express.Router();

// Get user info by ID
router.get('/:id', getUser);

// Update user info by ID
router.put('/:id', updateUser);

export default router;