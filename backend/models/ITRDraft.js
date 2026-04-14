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