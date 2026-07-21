import { ok, fail } from "../utils/apiResponse.js";
import {
  createEInvoice,
  listEInvoices,
  getEInvoiceById,
  updateEInvoice,
} from "../services/eInvoiceService.js";

export const create = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      userId: req.user.id,
    };

    const invoice = await createEInvoice(payload);
    return ok(res, { status: 201, data: invoice });
  } catch (error) {
    return fail(res, {
      status: 500,
      message: "Failed to create e-invoice",
      data: { error: error.message },
    });
  }
};

export const list = async (req, res) => {
  try {
    const filter = {
      ...(req.query.status ? { status: req.query.status } : {}),
      ...(req.query.sellerGstin ? { sellerGstin: req.query.sellerGstin } : {}),
      ...(req.query.buyerGstin ? { buyerGstin: req.query.buyerGstin } : {}),
    };

    const invoices = await listEInvoices(req.user.id, filter);
    return ok(res, { data: invoices });
  } catch (error) {
    return fail(res, {
      status: 500,
      message: "Failed to load e-invoices",
      data: { error: error.message },
    });
  }
};

export const getOne = async (req, res) => {
  try {
    const invoice = await getEInvoiceById(req.params.id, req.user.id);
    if (!invoice) {
      return fail(res, {
        status: 404,
        message: "E-Invoice not found",
      });
    }

    return ok(res, { data: invoice });
  } catch (error) {
    return fail(res, {
      status: 500,
      message: "Failed to load e-invoice",
      data: { error: error.message },
    });
  }
};

export const update = async (req, res) => {
  try {
    const updatedInvoice = await updateEInvoice(req.params.id, req.user.id, req.body);
    if (!updatedInvoice) {
      return fail(res, {
        status: 404,
        message: "E-Invoice not found or not owned by user",
      });
    }

    return ok(res, { data: updatedInvoice });
  } catch (error) {
    return fail(res, {
      status: 500,
      message: "Failed to update e-invoice",
      data: { error: error.message },
    });
  }
};
