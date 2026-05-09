import express from 'express';

const router = express.Router();

router.get('/', async (_req, res) => {
  void _req;

  res.status(501).json({
    success: false,
    message: 'Income API is not connected to persisted income data yet.',
    data: null,
    code: 'NOT_IMPLEMENTED',
  });
});

export default router;
