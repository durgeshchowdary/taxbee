import {
  createReviewAssignment,
  updateReviewAssignmentStatus,
  getReviewBoard,
} from "../services/reviewWorkflowService.js";

export const createAssignment = async (req, res, next) => {
  try {
    const assignment = await createReviewAssignment({
      workspaceOwnerId: req.user.id,
      reviewerUserId: req.body.reviewerUserId,
      importedDocumentId: req.body.importedDocumentId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      dueAt: req.body.dueAt,
    });

    return res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const assignment = await updateReviewAssignmentStatus({
      workspaceOwnerId: req.user.id,
      assignmentId: req.params.id,
      status: req.body.status,
      actorUserId: req.user.id,
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    return res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoard = async (req, res, next) => {
  try {
    const board = await getReviewBoard({
      workspaceOwnerId: req.user.id,
    });

    return res.json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};