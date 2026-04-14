import ITRDraft from '../models/ITRDraft.js';

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
        salary,
        houseProperty,
        pgbp,
        capitalGains,
        otherSources,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: 'Draft saved successfully',
      draft,
    });
  } catch (error) {
    console.error('saveDraft error:', error);
    res.status(500).json({ message: 'Server error while saving draft' });
  }
};

export const getDraft = async (req, res) => {
  try {
    const { userKey } = req.params;

    const draft = await ITRDraft.findOne({ userKey });

    if (!draft) {
      return res.status(200).json({ draft: null });
    }

    res.status(200).json({ draft });
  } catch (error) {
    console.error('getDraft error:', error);
    res.status(500).json({ message: 'Server error while fetching draft' });
  }
};