import express from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireActiveSubscription } from "../middleware/subscriptionMiddleware.js";

const router = express.Router();
router.use(requireActiveSubscription);
router.get('/', requireAuth, getDashboard);

export default router;
