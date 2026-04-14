import express from 'express';
import { saveDraft, getDraft } from '../controllers/itrDraftController.js';

const router = express.Router();

router.post('/', saveDraft);
router.get('/:userKey', getDraft);

export default router;