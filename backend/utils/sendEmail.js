import { sendEmailMessage } from "../services/emailService.js";

export const sendEmail = async (to, subject, text) => {
  return sendEmailMessage({ to, subject, text });
};
