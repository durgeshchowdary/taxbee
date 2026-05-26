import User from '../models/user.js';
import { fail } from '../utils/apiResponse.js';
import { requireObjectId } from '../utils/mongoSafety.js';
import { sanitizeText } from '../middleware/validationMiddleware.js';

// Get user by ID
export const getUser = async (req, res) => {
  try {
    requireObjectId(req.params.id);
    if (String(req.params.id) !== String(req.user.id)) {
      return fail(res, { status: 403, message: 'You can only access your own profile' });
    }
    const user = await User.findById(req.params.id).select('-password'); // hide password
    if (!user) return fail(res, { status: 404, message: 'User not found' });

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: { user },
      user,
    });
  } catch (error) {
    fail(res, { status: error.status || 500, message: error.status ? error.message : 'Server error while fetching user' });
  }
};

// Update user by ID
export const updateUser = async (req, res) => {
  try {
    requireObjectId(req.params.id);
    if (String(req.params.id) !== String(req.user.id)) {
      return fail(res, { status: 403, message: 'You can only update your own profile' });
    }
    const updates = {
      ...(req.body?.name ? { name: sanitizeText(req.body.name, 120) } : {}),
    };
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return fail(res, { status: 404, message: 'User not found' });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
      user: updatedUser,
    });
  } catch (error) {
    fail(res, { status: error.status || 500, message: error.status ? error.message : 'Server error while updating user' });
  }
};
