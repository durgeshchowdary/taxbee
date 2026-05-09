import User from '../models/user.js';
import { fail } from '../utils/apiResponse.js';

// Get user by ID
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // hide password
    if (!user) return fail(res, { status: 404, message: 'User not found' });

    res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: { user },
      user,
    });
  } catch {
    fail(res, { status: 500, message: 'Server error while fetching user' });
  }
};

// Update user by ID
export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return fail(res, { status: 404, message: 'User not found' });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
      user: updatedUser,
    });
  } catch {
    fail(res, { status: 500, message: 'Server error while updating user' });
  }
};
