import { getAlerts } from "../services/alertService.js";

export const getSystemAlerts = async (req, res) => {
  return res.json({
    success: true,
    data: getAlerts(),
  });
};
