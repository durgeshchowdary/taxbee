import mongoose from 'mongoose';

const ITRDraftSchema = new mongoose.Schema(
  {
    userKey: { type: String, required: true, unique: true },

    salary: {
      salary17_1: { type: String, default: '' },
      perquisites17_2: { type: String, default: '' },
      profits17_3: { type: String, default: '' },
      exemptions10: { type: String, default: '' },
      deductions16: { type: String, default: '' },
      basicSalary: { type: String, default: '' },
      dearnessAllowance: { type: String, default: '' },
      bonusCommission: { type: String, default: '' },
      hraReceived: { type: String, default: '' },
      professionalTaxPaid: { type: String, default: '' },
      ltaReceived: { type: String, default: '' },
      overtimeAllowance: { type: String, default: '' },
      advanceSalary: { type: String, default: '' },
      arrearsOfSalary: { type: String, default: '' },
      leaveSalaryDuringService: { type: String, default: '' },
      pensionUncommuted: { type: String, default: '' },
      feesWagesAnnuity: { type: String, default: '' },
      otherAllowances: { type: String, default: '' },
      rentFreeAccommodation: { type: String, default: '' },
      carFacility: { type: String, default: '' },
      interestFreeLoan: { type: String, default: '' },
      esop: { type: String, default: '' },
      freeGasElectricityWater: { type: String, default: '' },
      freeEducation: { type: String, default: '' },
      householdStaff: { type: String, default: '' },
      creditCardExpenses: { type: String, default: '' },
      clubExpenses: { type: String, default: '' },
      giftTaxablePortion: { type: String, default: '' },
      useTransferOfAssets: { type: String, default: '' },
      employerContribution: { type: String, default: '' },
      otherPerquisites: { type: String, default: '' },
      perquisiteDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
      compensationOnTermination: { type: String, default: '' },
      retrenchmentCompensation: { type: String, default: '' },
      keymanInsurance: { type: String, default: '' },
      otherReceipts: { type: String, default: '' },
      hraExemption: { type: String, default: '' },
      ltaExemption: { type: String, default: '' },
      allowances10_14: { type: String, default: '' },
      gratuityExemption: { type: String, default: '' },
      leaveEncashmentExemption: { type: String, default: '' },
      commutedPensionExemption: { type: String, default: '' },
      vrsExemption: { type: String, default: '' },
      retrenchmentCompensationExemption: { type: String, default: '' },
      pfSuperannuationExemptPortion: { type: String, default: '' },
      otherExemptions: { type: String, default: '' },
      standardDeduction: { type: String, default: '' },
      professionalTaxDeduction: { type: String, default: '' },
      entertainmentAllowanceDeduction: { type: String, default: '' },
    },

    houseProperty: {
      annualRent: { type: String, default: '' },
      municipalTax: { type: String, default: '' },
      interestOnLoan: { type: String, default: '' },
    },

    pgbp: {
      businessReceipts: { type: String, default: '' },
      businessExpenses: { type: String, default: '' },
      otherBusinessIncome: { type: String, default: '' },
      depreciation: { type: String, default: '' },
    },

    capitalGains: {
      saleValue: { type: String, default: '' },
      costOfAcquisition: { type: String, default: '' },
      transferExpenses: { type: String, default: '' },
    },

    otherSources: {
      savingsInterest: { type: String, default: '' },
      fdInterest: { type: String, default: '' },
      dividendIncome: { type: String, default: '' },
      otherIncome: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const ITRDraft = mongoose.model('ITRDraft', ITRDraftSchema);

export default ITRDraft;
