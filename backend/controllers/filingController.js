import {
  createFiling,
  getFilings,
  getFilingById,
  updateFilingStatus,
} from "../services/filingService.js";

export const create = async (req, res) => {
  try {
   const filing = await createFiling({
  ...req.body,
  userKey: req.user.id,
});
    res.status(201).json(filing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const list = async (req, res) => {
  try {
    const filings = await getFilings(req.user.id);
    res.json(filings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const filing = await getFilingById(req.params.id);

    if (!filing) {
      return res.status(404).json({ error: "Filing not found" });
    }

    res.json(filing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const filing = await updateFilingStatus(
      req.params.id,
      req.body.filingStatus
    );

    res.json(filing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};