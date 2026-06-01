const emailQueue = [];

export const queueEmail = async ({ to, subject, html }) => {
  const emailJob = {
    id: String(Date.now()),
    to,
    subject,
    html,
    status: "queued",
    createdAt: new Date(),
  };

  emailQueue.push(emailJob);

  return emailJob;
};

export const getQueuedEmails = () => {
  return emailQueue;
};

export const processEmailQueue = async () => {
  const processed = [];

  while (emailQueue.length > 0) {
    const email = emailQueue.shift();

    email.status = "sent";
    email.sentAt = new Date();

    processed.push(email);
  }

  return {
    processedCount: processed.length,
    processed,
  };
};

export default {
  queueEmail,
  getQueuedEmails,
  processEmailQueue,
};