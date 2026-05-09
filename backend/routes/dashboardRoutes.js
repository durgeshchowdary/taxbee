import express from 'express';

const router = express.Router();

router.get('/', async (_req, res) => {
  void _req;

  res.status(501).json({
    success: false,
    message: 'Dashboard API is not connected to persisted tax data yet.',
    data: null,
    code: 'NOT_IMPLEMENTED',
  });
});

export default router;
