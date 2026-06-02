import { getAdminDashboardStats } from "../services/adminDashboardService.js";

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await getAdminDashboardStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDashboardHealth = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDashboardActivity = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        message: "Activity feed coming in next layer",
        timestamp: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};