import SupportTicket from "../models/SupportTicket.js";

export const generateTicketNumber = () => {
  return `TB-TICKET-${Date.now()}`;
};

export const createSupportTicket = async ({
  userId,
  subject,
  description,
  category = "other",
  priority = "medium",
}) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!subject || !description) {
    throw new Error("Subject and description are required");
  }

  return SupportTicket.create({
    ticketNumber: generateTicketNumber(),
    userId,
    subject,
    description,
    category,
    priority,
    status: "open",
  });
};

export const listSupportTickets = async ({
  status,
  priority,
  userId,
  limit = 50,
} = {}) => {
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (userId) filter.userId = userId;

  return SupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

export const updateSupportTicket = async ({
  ticketId,
  status,
  priority,
  assignedTo,
  adminNotes,
}) => {
  const updates = {};

  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;

  const ticket = await SupportTicket.findByIdAndUpdate(ticketId, updates, {
    new: true,
    runValidators: true,
  });

  if (!ticket) {
    throw new Error("Support ticket not found");
  }

  return ticket;
};

export const getSupportAnalytics = async () => {
  const byStatus = await SupportTicket.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const byPriority = await SupportTicket.aggregate([
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    byStatus: byStatus.map((item) => ({
      status: item._id,
      count: item.count,
    })),
    byPriority: byPriority.map((item) => ({
      priority: item._id,
      count: item.count,
    })),
  };
};

export default {
  createSupportTicket,
  listSupportTickets,
  updateSupportTicket,
  getSupportAnalytics,
};