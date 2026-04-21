const FY_LABEL = "FY 2025-26 / AY 2026-27";

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const clamp = (value, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

const formatRupees = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

const calculateSlabTax = (income, slabs) => {
  let tax = 0;

  for (const slab of slabs) {
    const upper = slab.upTo ?? Number.POSITIVE_INFINITY;
    const taxableInSlab = clamp(income - slab.from, 0, upper - slab.from);
    tax += taxableInSlab * slab.rate;
  }

  return tax;
};

const newRegimeSlabs = [
  { from: 0, upTo: 400000, rate: 0 },
  { from: 400000, upTo: 800000, rate: 0.05 },
  { from: 800000, upTo: 1200000, rate: 0.1 },
  { from: 1200000, upTo: 1600000, rate: 0.15 },
  { from: 1600000, upTo: 2000000, rate: 0.2 },
  { from: 2000000, upTo: 2400000, rate: 0.25 },
  { from: 2400000, rate: 0.3 },
];

const oldRegimeSlabs = [
  { from: 0, upTo: 250000, rate: 0 },
  { from: 250000, upTo: 500000, rate: 0.05 },
  { from: 500000, upTo: 1000000, rate: 0.2 },
  { from: 1000000, rate: 0.3 },
];

const getContextPieces = (context = {}) => {
  const draft = context.currentDraft || context.itrDraft || {};
  const salary = draft.salary || {};
  const houseProperty = draft.houseProperty || {};
  const pgbp = draft.pgbp || {};
  const capitalGains = draft.capitalGains || {};
  const otherSources = draft.otherSources || {};
  const deductions = context.deductions || context.currentDeductions || {};

  return {
    draft,
    salary,
    houseProperty,
    pgbp,
    capitalGains,
    otherSources,
    deductions,
  };
};

export const analyzeTaxContext = (context = {}) => {
  const {
    salary,
    houseProperty,
    pgbp,
    capitalGains,
    otherSources,
    deductions,
  } = getContextPieces(context);

  const salary17_1 = toNumber(salary.salary17_1);
  const perquisites17_2 = toNumber(salary.perquisites17_2);
  const profits17_3 = toNumber(salary.profits17_3);
  const exemptions10 = toNumber(salary.exemptions10);
  const deductions16Input = toNumber(salary.deductions16);
  const grossSalary = salary17_1 + perquisites17_2 + profits17_3;
  const salaryIncome = grossSalary - exemptions10 - deductions16Input;

  const netAnnualValue =
    toNumber(houseProperty.annualRent) - toNumber(houseProperty.municipalTax);
  const houseStandardDeduction = netAnnualValue > 0 ? netAnnualValue * 0.3 : 0;
  const housePropertyIncome =
    netAnnualValue - houseStandardDeduction - toNumber(houseProperty.interestOnLoan);

  const businessIncome =
    toNumber(pgbp.businessReceipts) -
    toNumber(pgbp.businessExpenses) +
    toNumber(pgbp.otherBusinessIncome) -
    toNumber(pgbp.depreciation);

  const capitalGainsIncome =
    toNumber(capitalGains.saleValue) -
    toNumber(capitalGains.costOfAcquisition) -
    toNumber(capitalGains.transferExpenses);

  const otherSourcesIncome =
    toNumber(otherSources.savingsInterest) +
    toNumber(otherSources.fdInterest) +
    toNumber(otherSources.dividendIncome) +
    toNumber(otherSources.otherIncome);

  const grossTotalIncome =
    salaryIncome +
    housePropertyIncome +
    businessIncome +
    capitalGainsIncome +
    otherSourcesIncome;

  const section80C = clamp(toNumber(deductions.section80C), 0, 150000);
  const healthInsurance80D = clamp(toNumber(deductions.healthInsurance), 0, 25000);
  const homeLoanInterest = clamp(toNumber(deductions.homeLoanInterest), 0, 200000);
  const oldRegimeDeductions = section80C + healthInsurance80D + homeLoanInterest;

  const newRegimeStandardDeduction = grossSalary > 0 ? 75000 : 0;
  const oldRegimeTaxableIncome = clamp(grossTotalIncome - oldRegimeDeductions);
  const newRegimeTaxableIncome = clamp(grossTotalIncome - newRegimeStandardDeduction);

  let oldTaxBeforeCess = calculateSlabTax(oldRegimeTaxableIncome, oldRegimeSlabs);
  let newTaxBeforeCess = calculateSlabTax(newRegimeTaxableIncome, newRegimeSlabs);

  if (oldRegimeTaxableIncome <= 500000) oldTaxBeforeCess = 0;
  if (newRegimeTaxableIncome <= 1200000) newTaxBeforeCess = 0;

  const oldTax = oldTaxBeforeCess * 1.04;
  const newTax = newTaxBeforeCess * 1.04;
  const betterRegime =
    oldTax < newTax ? "old" : newTax < oldTax ? "new" : "same";

  const missingFields = [
    ["Salary u/s 17(1)", salary.salary17_1],
    ["Perquisites u/s 17(2)", salary.perquisites17_2],
    ["Profits in lieu of salary u/s 17(3)", salary.profits17_3],
    ["Exemptions u/s 10", salary.exemptions10],
    ["Deductions u/s 16", salary.deductions16],
    ["80C investments", deductions.section80C],
    ["Health insurance premium 80D", deductions.healthInsurance],
    ["Home loan interest", deductions.homeLoanInterest],
  ]
    .filter(([, value]) => value === undefined || value === null || value === "")
    .map(([label]) => label);

  const warnings = [];
  if (exemptions10 > grossSalary && grossSalary > 0) {
    warnings.push("Exemptions u/s 10 are higher than gross salary. Recheck Form 16.");
  }
  if (deductions16Input > grossSalary && grossSalary > 0) {
    warnings.push("Deductions u/s 16 are higher than gross salary. Recheck the amount.");
  }
  if (grossTotalIncome < 0) {
    warnings.push("Total income is negative. Confirm losses and supporting documents.");
  }
  if (toNumber(deductions.section80C) > 150000) {
    warnings.push("80C is capped at Rs. 1,50,000 in this estimate.");
  }
  if (toNumber(deductions.healthInsurance) > 25000) {
    warnings.push("80D is capped at Rs. 25,000 here for a non-senior citizen estimate.");
  }

  const recommendations = [];
  if (!deductions.section80C || toNumber(deductions.section80C) < 150000) {
    recommendations.push("Check eligible 80C items such as EPF, PPF, ELSS, life insurance, or principal repayment if using the old regime.");
  }
  if (!deductions.healthInsurance) {
    recommendations.push("Check health insurance premium eligibility under 80D if using the old regime.");
  }
  if (grossSalary > 0 && !salary.deductions16) {
    recommendations.push("Verify standard deduction/professional tax details from Form 16.");
  }
  if (newTax < oldTax) {
    recommendations.push("New regime currently looks better in this estimate because deductions are limited or income fits the new rebate/slabs.");
  } else if (oldTax < newTax) {
    recommendations.push("Old regime currently looks better in this estimate because deductions reduce taxable income enough.");
  }

  return {
    fy: FY_LABEL,
    income: {
      grossSalary,
      salaryIncome,
      housePropertyIncome,
      businessIncome,
      capitalGainsIncome,
      otherSourcesIncome,
      grossTotalIncome,
    },
    deductions: {
      section80C,
      healthInsurance80D,
      homeLoanInterest,
      oldRegimeDeductions,
      newRegimeStandardDeduction,
    },
    tax: {
      oldRegimeTaxableIncome,
      newRegimeTaxableIncome,
      oldRegimeEstimatedTax: Math.round(oldTax),
      newRegimeEstimatedTax: Math.round(newTax),
      betterRegime,
      estimatedSavings: Math.round(Math.abs(oldTax - newTax)),
    },
    missingFields,
    warnings,
    recommendations,
  };
};

export const renderTaxAnalysis = (analysis) => {
  const better =
    analysis.tax.betterRegime === "same"
      ? "both regimes look equal"
      : `${analysis.tax.betterRegime} regime looks better`;

  return [
    `For ${analysis.fy}, your estimated gross total income is ${formatRupees(
      analysis.income.grossTotalIncome
    )}.`,
    `Estimated tax: old regime ${formatRupees(
      analysis.tax.oldRegimeEstimatedTax
    )}, new regime ${formatRupees(analysis.tax.newRegimeEstimatedTax)}. So ${better}.`,
    analysis.missingFields.length
      ? `Missing fields to review: ${analysis.missingFields.join(", ")}.`
      : "No tracked fields look blank right now.",
    analysis.warnings.length
      ? `Warnings: ${analysis.warnings.join(" ")}`
      : "No major consistency warnings found in the tracked fields.",
    analysis.recommendations.length
      ? `Next checks: ${analysis.recommendations.slice(0, 3).join(" ")}`
      : "Next check: verify Form 16, AIS/26AS, TDS, and regime choice before filing.",
    "This is an estimate for planning, not final tax advice.",
  ].join("\n");
};
