const emailQueue = [];

export const queueEmail = async ({
  to,
  subject,
  html,
}) => {
  emailQueue.push({
    id: Date.now(),
    to,
    subject,
    html,
    status: "queued",
    createdAt: new Date(),
  });

  return true;
};

export const getQueuedEmails = () => {
  return emailQueue;
};

export const processEmailQueue = async () => {
  while (emailQueue.length > 0) {
    const email = emailQueue.shift();

    console.log(
      `Sending email to ${email.to}: ${email.subject}`
    );

    // Future:
    // await nodemailer.sendMail(...)
  }

  return true;
};

export default {
    
  queueEmail,
  processEmailQueue,
  getQueuedEmails,
};