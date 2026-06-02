import User from "../models/User.js";
import SupportTicket from "../models/SupportTicket.js";
import UsageMetric from "../models/UsageMetric.js";
import BackupRecord from "../models/BackupRecord.js";

export const getAdminDashboardStats = async () => {
  const [
    totalUsers,
    openTickets,
    totalMetrics,
    totalBackups,
  ] = await Promise.all([
    User.countDocuments(),
    SupportTicket.countDocuments({
      status: { $in: ["open", "in_progress"] },
    }),
    UsageMetric.countDocuments(),
    BackupRecord.countDocuments(),
  ]);

  return {
    totalUsers,
    openTickets,
    totalMetrics,
    totalBackups,
    generatedAt: new Date(),
  };
};

export default {
  getAdminDashboardStats,
};