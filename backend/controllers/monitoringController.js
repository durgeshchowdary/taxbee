import { getMetrics } from "../services/monitoringService.js";

export const getMonitoringMetrics = async (req, res) => {
  return res.json({
    success: true,
    data: getMetrics(),
  });
};