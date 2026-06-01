import {
  softDeleteDocument,
  restoreDocument,
  permanentlyDeleteDocument,
} from "../services/documentLifecycleService.js";

export const deleteDocument = async (req, res, next) => {
  try {
    const result = await softDeleteDocument({
      userId: req.user.id,
      documentId: req.params.id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.json({
      success: true,
      message: "Document moved to recycle bin",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const restoreDeletedDocument = async (req, res, next) => {
  try {
    const result = await restoreDocument({
      userId: req.user.id,
      documentId: req.params.id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.json({
      success: true,
      message: "Document restored",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const permanentlyDelete = async (req, res, next) => {
  try {
    const result = await permanentlyDeleteDocument({
      userId: req.user.id,
      documentId: req.params.id,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.json({
      success: true,
      message: "Document permanently deleted",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};