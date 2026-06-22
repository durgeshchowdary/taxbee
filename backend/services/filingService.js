import TaxFiling from "../models/TaxFiling.js";

export const createFiling = async (data) => {
  return TaxFiling.create(data);
};

export const getFilings = async (userKey) => {
  return TaxFiling.find({ userKey }).sort({ createdAt: -1 });
};

export const getFilingById = async (id, userKey) => {
  return TaxFiling.findOne({
    _id: id,
    userKey,
  });
};

export const updateFilingStatus = async (
  id,
  userKey,
  filingStatus
) => {
  return TaxFiling.findOneAndUpdate(
    {
      _id: id,
      userKey,
    },
    { filingStatus },
    { new: true }
  );
};