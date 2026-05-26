import express from 'express';
import {
  getAuthenticatedDraft,
  getDraft,
  saveAuthenticatedDraft,
  saveDraft,
} from '../controllers/itrDraftController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(requireAuth, getAuthenticatedDraft)
  .put(requireAuth, saveAuthenticatedDraft)
  .post(requireAuth, saveAuthenticatedDraft);

router.post('/legacy', requireAuth, saveDraft);
router.get('/:userKey', requireAuth, getDraft);

export default router;
