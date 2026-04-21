import ITRDraft from '../models/itrDraft.js';

export const saveDraft = async (req, res) => {
  try {
    const {
      userKey,
      salary,
      houseProperty,
      pgbp,
      capitalGains,
      otherSources,
    } = req.body;

    if (!userKey) {
      return res.status(400).json({ message: 'userKey is required' });
    }

    const draft = await ITRDraft.findOneAndUpdate(
      { userKey },
      {
        userKey,
        salary: salary || {},
        houseProperty: houseProperty || {},
        pgbp: pgbp || {},
        capitalGains: capitalGains || {},
        otherSources: otherSources || {},
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      message: 'Draft saved successfully',
      draft,
    });
  } catch (error) {
    console.error('saveDraft error:', error);
    res.status(500).json({
      message: 'Server error while saving draft',
      error: error.message,
    });
  }
};

export const getDraft = async (req, res) => {
  try {
    const { userKey } = req.params;

    if (!userKey) {
      return res.status(400).json({ message: 'userKey is required' });
    }

    const draft = await ITRDraft.findOne({ userKey });

    if (!draft) {
      return res.status(200).json({ draft: null });
    }

    res.status(200).json({ draft });
  } catch (error) {
    console.error('getDraft error:', error);
    res.status(500).json({
      message: 'Server error while fetching draft',
      error: error.message,
    });
  }
};