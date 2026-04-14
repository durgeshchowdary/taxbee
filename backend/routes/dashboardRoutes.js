import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  // temporary sample response
  // later you can fetch this from MongoDB based on logged-in user
  res.json({
    filingStatus: 'Not Filed',
    taxHealthScore: 75,
    refundStatus: 0,
    totalIncome: 850000,
    deductions: 120000,
    taxPayable: 27400,
    refundDue: 5200,
    taxSaved: 45000,
    verifiedPan: 'XXXXX1234X',
    suggestions: [
      'Invest ₹50,000 under 80C to save ₹15,600 tax',
      'Get health insurance to reduce your tax by ₹7,500',
      'Optimize your HRA to save more',
    ],
    activities: [
      { text: 'Salary details added', status: 'done' },
      { text: 'Deductions entered', status: 'done' },
      { text: 'ITR not filed', status: 'pending' },
    ],
  });
});

export default router;