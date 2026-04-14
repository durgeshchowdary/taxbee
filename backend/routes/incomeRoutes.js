import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
  // TEMP: static data (later from DB)
  res.json({
    salary: 1280000,
    house: -80000,
    pgbp: 640000,
    capital: 110000,
    other: 50000,
  });
});

export default router;