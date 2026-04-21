/**
 * Helper for Old Regime Tax Calculation (AY 2024-25)
 * Includes standard rebate u/s 87A and 4% Cess.
 */
export const calculateOldRegimeTax = (taxableIncome) => {
  if (taxableIncome <= 500000) return 0; // Rebate u/s 87A makes it nil for income up to 5L

  let tax = 0;
  if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.3 + 112500;
  else if (taxableIncome > 500000) tax += (taxableIncome - 500000) * 0.2 + 12500;

  return tax * 1.04; // Add 4% Health & Education Cess
};