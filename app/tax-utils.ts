import Fraction from 'fraction.js';

/**
 * Rounds tax value to the nearest multiple of 10 as per Section 288B.
 */
export function roundTax(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Calculates tax based on progressive income slabs using high-precision arithmetic.
 */
export function calculateSlabTax(
  taxableIncome: number,
  slabs: [limit: number, rate: number][],
  regime: 'Old' | 'New' = 'New'
) {
  let totalTax = new Fraction(0);
  let previousLimit = new Fraction(0);
  const income = new Fraction(taxableIncome);

  for (const [limit, rate] of slabs) {
    const currentLimit = limit === Infinity ? income : new Fraction(limit);

    const slabUpper = income.compare(currentLimit) < 0 ? income : currentLimit;
    const taxableInSlab = slabUpper.sub(previousLimit);

    if (taxableInSlab.compare(0) > 0) {
      totalTax = totalTax.add(taxableInSlab.mul(rate));
    }

    if (income.compare(currentLimit) <= 0) {
      break;
    }

    previousLimit = currentLimit;
  }

  // Calculate Surcharge based on income thresholds
  const incomeVal = taxableIncome;
  let surchargeRate = 0;
  if (incomeVal > 50000000) surchargeRate = regime === 'New' ? 0.25 : 0.37; // Cap at 25% for New Regime
  else if (incomeVal > 20000000) surchargeRate = 0.25;
  else if (incomeVal > 10000000) surchargeRate = 0.15;
  else if (incomeVal > 5000000) surchargeRate = 0.10;

  const baseTax: Fraction = totalTax;
  const surcharge: Fraction = baseTax.mul(surchargeRate);
  const totalBeforeCess: Fraction = baseTax.add(surcharge);

  // Final Liability = (Base Tax + Surcharge) + 4% Cess
  const finalLiability = totalBeforeCess.mul(1.04);
  return roundTax(finalLiability.valueOf());
}

/**
 * Computes the comparison between Old and New Tax Regimes (FY 2024-25).
 */
export function calculateEstimate(income: number, deductions: number) {
  const oldTaxable = Math.max(0, income - deductions);
  const newTaxable = Math.max(0, income - 75000); // Standard deduction increased to 75k in Budget 2024

  const oldRegime = calculateSlabTax(oldTaxable, [
    [250000, 0],
    [500000, 0.05],
    [1000000, 0.2],
    [Infinity, 0.3],
  ], 'Old');

  const newRegime = calculateSlabTax(newTaxable, [
    [300000, 0],
    [700000, 0.05], // Note: Rebate u/s 87A not applied here for simplicity
    [1000000, 0.1],
    [1200000, 0.15],
    [1500000, 0.2],
    [Infinity, 0.3],
  ], 'New');

  return {
    oldRegime,
    newRegime,
    suggested: oldRegime <= newRegime ? ('Old' as const) : ('New' as const),
    saving: Math.abs(oldRegime - newRegime),
  };
}

export function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}