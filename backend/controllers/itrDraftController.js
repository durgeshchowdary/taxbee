import ITRDraft from '../models/ITRDraft.js';
import { fail } from '../utils/apiResponse.js';

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
      return fail(res, { status: 400, message: 'userKey is required' });
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
      success: true,
      message: 'Draft saved successfully',
      data: { draft },
      draft,
    });
  } catch (error) {
    console.error('saveDraft error:', error);
    fail(res, { status: 500, message: 'Server error while saving draft' });
  }
};

export const getDraft = async (req, res) => {
  try {
    const { userKey } = req.params;

    if (!userKey) {
      return fail(res, { status: 400, message: 'userKey is required' });
    }

    const draft = await ITRDraft.findOne({ userKey });

    if (!draft) {
      return res.status(200).json({
        success: true,
        message: 'Draft not found',
        data: { draft: null },
        draft: null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Draft fetched successfully',
      data: { draft },
      draft,
    });
  } catch (error) {
    console.error('getDraft error:', error);
    fail(res, { status: 500, message: 'Server error while fetching draft' });
  }
};
