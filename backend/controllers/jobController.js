import Job from "../models/Job.js";
import { fail } from "../utils/apiResponse.js";
import { requireObjectId } from "../utils/mongoSafety.js";
import { serializeJob } from "../services/jobQueueService.js";
import { logger } from "../utils/safeLogger.js";

export const getJob = async (req, res) => {
  try {
    const id = requireObjectId(req.params.id);
    const job = await Job.findOne({ _id: id, userId: req.user.id }).lean();

    if (!job) {
      return fail(res, { status: 404, message: "Job not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job status fetched successfully",
      data: { job: serializeJob(job) },
      job: serializeJob(job),
    });
  } catch (error) {
    logger.error("getJob error", error, { requestId: req.requestId });
    return fail(res, {
      status: error.status || 500,
      message: error.status ? error.message : "Server error while fetching job",
    });
  }
};
