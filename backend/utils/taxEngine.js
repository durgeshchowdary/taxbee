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

const getSurchargeRate = (income, regime) => {
  if (income > 50000000) return regime === "old" ? 0.37 : 0.25;
  if (income > 20000000) return 0.25;
  if (income > 10000000) return 0.15;
  if (income > 5000000) return 0.1;
  return 0;
};

const surchargeThresholds = [
  { income: 5000000, rateAbove: 0.1 },
  { income: 10000000, rateAbove: 0.15 },
  { income: 20000000, rateAbove: 0.25 },
  { income: 50000000, oldRateAbove: 0.37, newRateAbove: 0.25 },
];

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

export const calculateTaxByRegime = (taxableIncome, regime = "new") => {
  const income = clamp(toNumber(taxableIncome));
  const normalizedRegime = regime === "old" ? "old" : "new";
  const slabs = normalizedRegime === "old" ? oldRegimeSlabs : newRegimeSlabs;
  const rebateLimit = normalizedRegime === "old" ? 500000 : 1200000;

  let taxBeforeRebate = calculateSlabTax(income, slabs);
  if (income <= rebateLimit) taxBeforeRebate = 0;

  const surchargeRate = getSurchargeRate(income, normalizedRegime);
  let taxAfterSurcharge = taxBeforeRebate * (1 + surchargeRate);

  const threshold = surchargeThresholds.find((item) => {
    const rateAbove =
      normalizedRegime === "old" ? item.oldRateAbove ?? item.rateAbove : item.newRateAbove ?? item.rateAbove;
    return income > item.income && surchargeRate === rateAbove;
  });

  if (threshold) {
    const thresholdTax = calculateTaxByRegime(threshold.income, normalizedRegime).taxAfterSurcharge;
    taxAfterSurcharge = Math.min(taxAfterSurcharge, thresholdTax + income - threshold.income);
  }

  const cess = taxAfterSurcharge * 0.04;
  const totalTax = taxAfterSurcharge + cess;

  return {
    taxableIncome: income,
    taxBeforeRebate,
    surcharge: taxAfterSurcharge - taxBeforeRebate,
    taxAfterSurcharge,
    cess,
    totalTax,
  };
};

export const calculateOldRegimeTax = (taxableIncome) =>
  calculateTaxByRegime(taxableIncome, "old").totalTax;

export const calculateNewRegimeTax = (taxableIncome) =>
  calculateTaxByRegime(taxableIncome, "new").totalTax;

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

  const oldTaxBreakdown = calculateTaxByRegime(oldRegimeTaxableIncome, "old");
  const newTaxBreakdown = calculateTaxByRegime(newRegimeTaxableIncome, "new");
  const oldTax = oldTaxBreakdown.totalTax;
  const newTax = newTaxBreakdown.totalTax;
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
  const remaining80C = Math.max(0, 150000 - section80C);
  const remaining80D = Math.max(0, 25000 - healthInsurance80D);
  const oldTaxWithFull80C = calculateTaxByRegime(
    clamp(grossTotalIncome - (oldRegimeDeductions + remaining80C)),
    "old"
  ).totalTax;
  const oldTaxWithFull80C80D = calculateTaxByRegime(
    clamp(grossTotalIncome - (oldRegimeDeductions + remaining80C + remaining80D)),
    "old"
  ).totalTax;

  if (remaining80C > 0 && grossTotalIncome > 500000) {
    recommendations.push(
      `80C has ${formatRupees(remaining80C)} capacity left. Based on your current old-regime estimate, filling it could save about ${formatRupees(Math.max(0, oldTax - oldTaxWithFull80C))}.`
    );
  }
  if (remaining80D > 0 && grossTotalIncome > 500000) {
    recommendations.push(
      `80D has ${formatRupees(remaining80D)} non-senior capacity left. With full 80C and 80D, old-regime tax could reduce by about ${formatRupees(Math.max(0, oldTax - oldTaxWithFull80C80D))}.`
    );
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
      oldRegimeSurcharge: Math.round(oldTaxBreakdown.surcharge),
      newRegimeSurcharge: Math.round(newTaxBreakdown.surcharge),
      betterRegime,
      estimatedSavings: Math.round(Math.abs(oldTax - newTax)),
    },
    missingFields,
    warnings,
    recommendations,
  };
};

const getTaxStatement = (context = {}) =>
  context.aisImport || context.taxStatement || context.form26as || null;

const addPenalty = (penalties, condition, points, reason, action) => {
  if (!condition) return;
  penalties.push({ points, reason, action });
};

const anomalyPoints = (severity) => {
  if (severity === "high") return 35;
  if (severity === "medium") return 20;
  return 8;
};

const buildOldRegimeTax = ({ income, section80C = 0, healthInsurance80D = 0, homeLoanInterest = 0 }) =>
  calculateTaxByRegime(
    clamp(income - clamp(section80C, 0, 150000) - clamp(healthInsurance80D, 0, 25000) - clamp(homeLoanInterest, 0, 200000)),
    "old"
  ).totalTax;

const buildNewRegimeTax = ({ income, hasSalary = false }) =>
  calculateTaxByRegime(clamp(income - (hasSalary ? 75000 : 0)), "new").totalTax;

export const simulateDeductionScenarios = (context = {}) => {
  const analysis = context.analysis || analyzeTaxContext(context);
  const income = clamp(analysis.income.grossTotalIncome);
  const hasSalary = analysis.income.grossSalary > 0;
  const current80C = analysis.deductions.section80C;
  const current80D = analysis.deductions.healthInsurance80D;
  const currentHomeLoan = analysis.deductions.homeLoanInterest;
  const oldRegimeCurrentTax = Math.round(
    buildOldRegimeTax({
      income,
      section80C: current80C,
      healthInsurance80D: current80D,
      homeLoanInterest: currentHomeLoan,
    })
  );
  const oldRegimeOptimizedTax = Math.round(
    buildOldRegimeTax({
      income,
      section80C: 150000,
      healthInsurance80D: 25000,
      homeLoanInterest: currentHomeLoan,
    })
  );
  const currentBestTax = Math.min(
    analysis.tax.oldRegimeEstimatedTax,
    analysis.tax.newRegimeEstimatedTax
  );

  const scenarios = [
    {
      id: "current",
      label: "Current draft",
      tax: currentBestTax,
      regime:
        analysis.tax.betterRegime === "same" ? "Either regime" : `${analysis.tax.betterRegime} regime`,
      detail: "Uses the income and deductions entered right now.",
    },
    {
      id: "full80c",
      label: "Max 80C",
      tax: Math.min(
        buildOldRegimeTax({
          income,
          section80C: 150000,
          healthInsurance80D: current80D,
          homeLoanInterest: currentHomeLoan,
        }),
        buildNewRegimeTax({ income, hasSalary })
      ),
      regime: "Best of old/new",
      detail: `Adds ${formatRupees(Math.max(0, 150000 - current80C))} of remaining 80C capacity.`,
    },
    {
      id: "full80c80d",
      label: "Max 80C + 80D",
      tax: Math.min(
        buildOldRegimeTax({
          income,
          section80C: 150000,
          healthInsurance80D: 25000,
          homeLoanInterest: currentHomeLoan,
        }),
        buildNewRegimeTax({ income, hasSalary })
      ),
      regime: "Best of old/new",
      detail: "Tests full 80C and a non-senior 80D limit.",
    },
    {
      id: "bestRegime",
      label: "Best regime only",
      tax: currentBestTax,
      regime:
        analysis.tax.betterRegime === "same" ? "Either regime" : `${analysis.tax.betterRegime} regime`,
      detail: "Compares old and new regime using current draft values.",
    },
  ].map((scenario) => ({ ...scenario, tax: Math.round(scenario.tax) }));

  const bestTax = Math.min(...scenarios.map((scenario) => scenario.tax));
  const currentTax = scenarios.find((scenario) => scenario.id === "current")?.tax || currentBestTax;

  return {
    currentTax,
    bestTax,
    potentialSavings: Math.max(0, currentTax - bestTax),
    oldRegimeCurrentTax,
    oldRegimeOptimizedTax,
    oldRegimePotentialSavings: Math.max(0, oldRegimeCurrentTax - oldRegimeOptimizedTax),
    scenarios,
  };
};

export const detectTaxAnomalies = (context = {}) => {
  const analysis = context.analysis || analyzeTaxContext(context);
  const statement = getTaxStatement(context);
  const totals = statement?.totals || {};
  const aisSalary = toNumber(totals.salary);
  const aisInterest = toNumber(totals.interest);
  const tds = toNumber(totals.tds);
  const declaredInterest = analysis.income.otherSourcesIncome;
  const grossSalary = analysis.income.grossSalary;
  const bestTax = Math.min(
    analysis.tax.oldRegimeEstimatedTax,
    analysis.tax.newRegimeEstimatedTax
  );
  const flags = [];

  if (aisSalary > 0 && grossSalary > 0) {
    const mismatch = Math.abs(aisSalary - grossSalary);
    if (mismatch > Math.max(25000, aisSalary * 0.08)) {
      flags.push({
        severity: "high",
        title: "Salary mismatch",
        message: `Salary in imported tax statement differs from declared salary by ${formatRupees(mismatch)}.`,
        action: "Compare Form 16, AIS/Form 26AS, and the salary section.",
      });
    }
  }

  if (aisInterest > 0 && declaredInterest < aisInterest * 0.7) {
    flags.push({
      severity: "medium",
      title: "Interest income may be incomplete",
      message: `${formatRupees(aisInterest)} interest appears in imported data, but only ${formatRupees(declaredInterest)} is declared under other sources.`,
      action: "Review savings, FD, and dividend entries.",
    });
  }

  if (grossSalary > 0 && tds > 0 && bestTax > 25000 && tds < bestTax * 0.5) {
    flags.push({
      severity: "medium",
      title: "TDS looks low",
      message: `TDS found is ${formatRupees(tds)}, while estimated tax is ${formatRupees(bestTax)}.`,
      action: "Check Form 16 TDS and advance tax before filing.",
    });
  }

  if (analysis.deductions.oldRegimeDeductions > 0 && analysis.income.grossTotalIncome > 0) {
    const ratio = analysis.deductions.oldRegimeDeductions / analysis.income.grossTotalIncome;
    if (ratio > 0.45) {
      flags.push({
        severity: "medium",
        title: "High deduction ratio",
        message: "Deductions are unusually high compared with income.",
        action: "Keep investment and loan proofs ready.",
      });
    }
  }

  analysis.warnings.forEach((warning) => {
    flags.push({
      severity: "medium",
      title: "Draft consistency check",
      message: warning,
      action: "Review the source document and entered value.",
    });
  });

  if (!statement && analysis.income.grossTotalIncome > 0) {
    flags.push({
      severity: "low",
      title: "Tax statement not imported",
      message: "Income is entered, but AIS/Form 26AS is not connected yet.",
      action: "Import AIS/Form 26AS to check TDS and reported income.",
    });
  }

  const scoredFlags = flags.map((flag) => ({
    ...flag,
    points: anomalyPoints(flag.severity),
  }));

  const score = clamp(
    scoredFlags.reduce((total, flag) => total + flag.points, 0),
    0,
    100
  );

  return {
    score,
    level: score >= 70 ? "high" : score >= 35 ? "medium" : "low",
    flags: scoredFlags,
  };
};

export const calculateTaxHealthScore = (context = {}) => {
  const analysis = context.analysis || analyzeTaxContext(context);
  const statement = getTaxStatement(context);
  const anomalies = context.anomalies || detectTaxAnomalies({ ...context, analysis });
  const penalties = [];
  const current80C = analysis.deductions.section80C;
  const current80D = analysis.deductions.healthInsurance80D;

  addPenalty(
    penalties,
    !statement,
    18,
    "AIS/Form 26AS is not imported",
    "Import tax statement data before final review."
  );
  addPenalty(
    penalties,
    analysis.income.grossSalary > 0 && analysis.missingFields.includes("Deductions u/s 16"),
    10,
    "Salary is present but section 16 details are blank",
    "Verify standard deduction and professional tax from Form 16."
  );
  addPenalty(
    penalties,
    analysis.income.grossTotalIncome === 0,
    25,
    "Income details are not mapped yet",
    "Enter salary or import AIS/Form 26AS data."
  );
  addPenalty(
    penalties,
    current80C < 150000 && analysis.income.grossTotalIncome > 500000,
    10,
    "80C deduction capacity is underused",
    `Remaining 80C capacity is ${formatRupees(150000 - current80C)}.`
  );
  addPenalty(
    penalties,
    current80D === 0 && analysis.income.grossTotalIncome > 500000,
    7,
    "80D health insurance deduction is blank",
    "Add eligible health insurance premium if applicable."
  );

  anomalies.flags.forEach((flag) => {
    penalties.push({
      points: flag.severity === "high" ? 20 : flag.severity === "medium" ? 12 : 5,
      reason: flag.title,
      action: flag.action,
    });
  });

  const totalPenalty = clamp(
    penalties.reduce((total, penalty) => total + penalty.points, 0),
    0,
    100
  );

  return {
    score: Math.round(clamp(100 - totalPenalty, 0, 100)),
    penalties,
    summary:
      totalPenalty === 0
        ? "Your tracked tax data looks complete and consistent."
        : penalties
            .slice(0, 3)
            .map((penalty) => penalty.reason)
            .join(", "),
  };
};

export const planNextYearTax = (context = {}) => {
  const analysis = context.analysis || analyzeTaxContext(context);
  const growthRate = clamp(toNumber(context.growthRate ?? 0.1), 0, 1);
  const projectedIncome = Math.round(clamp(analysis.income.grossTotalIncome) * (1 + growthRate));
  const hasSalary = analysis.income.grossSalary > 0;
  const current80C = analysis.deductions.section80C;
  const current80D = analysis.deductions.healthInsurance80D;
  const currentHomeLoan = analysis.deductions.homeLoanInterest;

  const scenarios = [
    {
      id: "noPlanning",
      label: "No new planning",
      tax: buildNewRegimeTax({ income: projectedIncome, hasSalary }),
      detail: "Uses projected income and the new-regime standard deduction assumption.",
    },
    {
      id: "currentPattern",
      label: "Current pattern",
      tax: Math.min(
        buildOldRegimeTax({
          income: projectedIncome,
          section80C: current80C,
          healthInsurance80D: current80D,
          homeLoanInterest: currentHomeLoan,
        }),
        buildNewRegimeTax({ income: projectedIncome, hasSalary })
      ),
      detail: "Carries your current deduction pattern into next year.",
    },
    {
      id: "max80C",
      label: "80C only",
      tax: Math.min(
        buildOldRegimeTax({
          income: projectedIncome,
          section80C: 150000,
          healthInsurance80D: current80D,
          homeLoanInterest: currentHomeLoan,
        }),
        buildNewRegimeTax({ income: projectedIncome, hasSalary })
      ),
      detail: "Simulates full 80C planning.",
    },
    {
      id: "max80C80D",
      label: "80C + 80D",
      tax: Math.min(
        buildOldRegimeTax({
          income: projectedIncome,
          section80C: 150000,
          healthInsurance80D: 25000,
          homeLoanInterest: currentHomeLoan,
        }),
        buildNewRegimeTax({ income: projectedIncome, hasSalary })
      ),
      detail: "Simulates full 80C and non-senior 80D planning.",
    },
  ].map((scenario) => ({ ...scenario, tax: Math.round(scenario.tax) }));

  const baselineTax = scenarios.find((scenario) => scenario.id === "noPlanning")?.tax || 0;
  const bestTax = Math.min(...scenarios.map((scenario) => scenario.tax));

  return {
    growthRate,
    projectedIncome,
    baselineTax,
    bestTax,
    potentialSavings: Math.max(0, baselineTax - bestTax),
    scenarios,
  };
};

export const generateTaxExplanation = (context = {}) => {
  const analysis = context.analysis || analyzeTaxContext(context);
  const anomalies = context.anomalies || detectTaxAnomalies({ ...context, analysis });
  const savings = context.savings || simulateDeductionScenarios({ ...context, analysis });
  const health = context.health || calculateTaxHealthScore({ ...context, analysis, anomalies });
  const bestTax = Math.min(
    analysis.tax.oldRegimeEstimatedTax,
    analysis.tax.newRegimeEstimatedTax
  );
  const chosenRegime =
    analysis.tax.betterRegime === "same"
      ? "Either regime"
      : `${analysis.tax.betterRegime === "old" ? "Old" : "New"} regime`;

  const taxDrivers = [
    {
      label: "Gross salary",
      amount: Math.round(analysis.income.grossSalary),
      reason: "Salary u/s 17(1), perquisites u/s 17(2), and profits in lieu u/s 17(3).",
    },
    {
      label: "Gross total income",
      amount: Math.round(analysis.income.grossTotalIncome),
      reason: "Salary plus mapped house property, business, capital gains, and other sources.",
    },
    {
      label: "Old-regime deductions",
      amount: Math.round(analysis.deductions.oldRegimeDeductions),
      reason: "Current 80C, 80D, and home-loan deductions after statutory caps.",
    },
    {
      label: "New-regime standard deduction",
      amount: Math.round(analysis.deductions.newRegimeStandardDeduction),
      reason: "Applied when salary income exists under the new-regime estimate.",
    },
    {
      label: "Estimated payable tax",
      amount: Math.round(bestTax),
      reason: `${chosenRegime} is selected because old regime estimates ${formatRupees(
        analysis.tax.oldRegimeEstimatedTax
      )} and new regime estimates ${formatRupees(analysis.tax.newRegimeEstimatedTax)}.`,
    },
  ];

  const regimeComparison = [
    {
      regime: "Old",
      taxableIncome: analysis.tax.oldRegimeTaxableIncome,
      surcharge: analysis.tax.oldRegimeSurcharge,
      tax: analysis.tax.oldRegimeEstimatedTax,
      decision:
        analysis.tax.betterRegime === "old"
          ? "Best current option"
          : "Higher than the best current option",
    },
    {
      regime: "New",
      taxableIncome: analysis.tax.newRegimeTaxableIncome,
      surcharge: analysis.tax.newRegimeSurcharge,
      tax: analysis.tax.newRegimeEstimatedTax,
      decision:
        analysis.tax.betterRegime === "new"
          ? "Best current option"
          : analysis.tax.betterRegime === "same"
            ? "Tied with old regime"
            : "Higher than the best current option",
    },
  ];

  const scenarioComparison = savings.scenarios.map((scenario) => ({
    ...scenario,
    savingVsCurrent: Math.max(0, savings.currentTax - scenario.tax),
  }));

  const riskBreakdown = anomalies.flags.map((flag) => ({
    title: flag.title,
    severity: flag.severity,
    points: flag.points,
    reason: flag.message,
    action: flag.action,
  }));

  const healthBreakdown = health.penalties.map((penalty) => ({
    points: penalty.points,
    reason: penalty.reason,
    action: penalty.action,
  }));

  return {
    headline: `${chosenRegime} currently gives the lowest estimate at ${formatRupees(bestTax)}.`,
    taxDrivers,
    regimeComparison,
    scenarioComparison,
    riskBreakdown,
    healthBreakdown,
  };
};

export const buildTaxIntelligence = (context = {}) => {
  const analysis = analyzeTaxContext(context);
  const anomalies = detectTaxAnomalies({ ...context, analysis });
  const health = calculateTaxHealthScore({ ...context, analysis, anomalies });
  const savings = simulateDeductionScenarios({ ...context, analysis });
  const nextYear = planNextYearTax({ ...context, analysis });
  const explanation = generateTaxExplanation({
    ...context,
    analysis,
    anomalies,
    health,
    savings,
  });

  return {
    analysis,
    health,
    savings,
    anomalies,
    nextYear,
    explanation,
    recommendations: [
      ...savings.scenarios
        .filter((scenario) => scenario.id !== "current" && savings.currentTax > scenario.tax)
        .map((scenario) => ({
          title: scenario.label,
          detail: `${scenario.detail} Estimated saving: ${formatRupees(savings.currentTax - scenario.tax)}.`,
          impact: savings.currentTax - scenario.tax,
        })),
      savings.oldRegimePotentialSavings > 0
        ? {
            title: "Old-regime deduction simulation",
            detail: `If you choose the old regime, maximizing 80C and 80D can reduce old-regime tax by about ${formatRupees(savings.oldRegimePotentialSavings)}.`,
            impact: savings.oldRegimePotentialSavings,
          }
        : null,
      ...analysis.recommendations.map((detail) => ({
        title: "Review suggestion",
        detail,
        impact: 0,
      })),
    ].filter(Boolean).slice(0, 5),
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
