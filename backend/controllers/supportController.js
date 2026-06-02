import {
  createSupportTicket,
  listSupportTickets,
  updateSupportTicket,
  getSupportAnalytics,
} from "../services/supportService.js";

export const createTicket = async (req, res) => {
  try {
    const ticket = await createSupportTicket({
      userId: req.user?.id || req.user?._id,
      subject: req.body.subject,
      description: req.body.description,
      category: req.body.category || "other",
      priority: req.body.priority || "medium",
    });

    return res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTickets = async (req, res) => {
  try {
    const tickets = await listSupportTickets({
      status: req.query.status,
      priority: req.query.priority,
      userId: req.query.userId,
      limit: req.query.limit || 50,
    });

    return res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const ticket = await updateSupportTicket({
      ticketId: req.params.ticketId,
      status: req.body.status,
      priority: req.body.priority,
      assignedTo: req.body.assignedTo,
      adminNotes: req.body.adminNotes,
    });

    return res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSupportStats = async (req, res) => {
  try {
    const analytics = await getSupportAnalytics();

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};