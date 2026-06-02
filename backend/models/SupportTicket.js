import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "billing",
        "tax",
        "document",
        "technical",
        "account",
        "other",
      ],
      default: "other",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "resolved",
        "closed",
      ],
      default: "open",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

SupportTicketSchema.index({
  status: 1,
  priority: 1,
  createdAt: -1,
});

const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model(
    "SupportTicket",
    SupportTicketSchema
  );

export default SupportTicket;