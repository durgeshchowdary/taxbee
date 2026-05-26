import ITRDraft from '../models/ITRDraft.js';
import { fail } from '../utils/apiResponse.js';
import User from '../models/user.js';
import { recordAuditEvents } from '../services/auditTrailService.js';
import { resolveWorkspaceOwner } from '../services/workspaceAccessService.js';
import { logger } from '../utils/safeLogger.js';
import {
  invalidateUserTaxContextCache,
  normalizeDraftForContext,
  sanitizeQueryError,
  userKeyInFilter,
} from '../utils/taxContextService.js';

const userKeys = (user) => [String(user._id), user.email, user.name].filter(Boolean);

const flattenObject = (value, prefix = '', rows = []) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return rows;
  Object.entries(value).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenObject(child, path, rows);
    } else {
      rows.push([path, child ?? '']);
    }
  });
  return rows;
};

const getPathValue = (source = {}, path = '') =>
  path.split('.').reduce((value, part) => (value && typeof value === 'object' ? value[part] : undefined), source);

const stripIdentityFields = (payload = {}) => {
  const next = { ...payload };
  delete next.ownerUserId;
  delete next.userId;
  delete next.workspaceOwnerId;
  delete next.userKey;
  return next;
};

const draftDiagnostics = (req, service, error) => ({
  requestId: req.requestId,
  authenticated: Boolean(req.user?.id),
  service,
  queryError: error ? sanitizeQueryError(error) : null,
});

const requireControllerUser = (req, res) => {
  if (req.user?.id) return true;
  fail(res, {
    status: 401,
    message: 'Authentication token is required',
    code: 'AUTH_REQUIRED',
    data: draftDiagnostics(req, 'auth', null),
  });
  return false;
};

const draftAuditEvents = ({ userId, draft, previous = {}, payload = {}, sourceType = 'manual' }) =>
  flattenObject(payload)
    .filter(([path, value]) => !['sourceType', 'userKey'].includes(path) && String(getPathValue(previous, path) ?? '') !== String(value ?? ''))
    .map(([path, value]) => ({
      userId,
      eventType: sourceType === 'assistant' ? 'assistant_field_update' : 'itr_draft_update',
      entityType: 'ITRDraft',
      entityId: draft._id,
      fieldKey: path,
      oldValue: getPathValue(previous, path) ?? '',
      newValue: value ?? '',
      sourceType,
      actorType: sourceType === 'assistant' ? 'assistant' : 'user',
      metadata: { userKey: draft.userKey },
    }));

export const saveDraft = async (req, res) => {
  try {
    if (!requireControllerUser(req, res)) return;
    const {
      userKey,
      salary,
      houseProperty,
      pgbp,
      capitalGains,
      otherSources,
      deductions,
      aisImport,
      extractionReview,
    } = req.body;

    const user = await User.findById(req.user.id).lean();
    if (!user) return fail(res, { status: 404, message: 'Authenticated user was not found' });
    if (!userKey || !userKeys(user).includes(String(userKey))) {
      return fail(res, { status: 400, message: 'userKey is required' });
    }

    const existing = await ITRDraft.findOne({ userKey }).lean();
    const draft = await ITRDraft.findOneAndUpdate(
      { userKey },
      {
        userKey,
        salary: salary || {},
        houseProperty: houseProperty || {},
        pgbp: pgbp || {},
        capitalGains: capitalGains || {},
        otherSources: otherSources || {},
        deductions: deductions || {},
        aisImport: aisImport || null,
        extractionReview: Array.isArray(extractionReview) ? extractionReview : [],
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    await recordAuditEvents(
      draftAuditEvents({
        userId: req.user?.id,
        draft,
        previous: existing || {},
        payload: { salary, houseProperty, pgbp, capitalGains, otherSources, deductions },
      })
    );
    invalidateUserTaxContextCache(req.user?.id);

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: { draft },
      draft,
    });
  } catch (error) {
    logger.error('saveDraft error', error, { requestId: req.requestId });
    fail(res, { status: 500, message: 'Server error while saving draft' });
  }
};

export const getDraft = async (req, res) => {
  try {
    if (!requireControllerUser(req, res)) return;
    const { userKey } = req.params;

    const user = await User.findById(req.user.id).lean();
    if (!user) return fail(res, { status: 404, message: 'Authenticated user was not found' });
    if (!userKey || !userKeys(user).includes(String(userKey))) {
      return fail(res, { status: 403, message: 'You can only access your own draft' });
    }

    const draft = await ITRDraft.findOne({ userKey });

    if (!draft) {
      return res.status(200).json({
        success: true,
        message: 'Draft not found',
        data: { draft: null },
        draft: null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Draft fetched successfully',
      data: { draft },
      draft,
    });
  } catch (error) {
    logger.error('getDraft error', error, { requestId: req.requestId });
    fail(res, { status: 500, message: 'Server error while fetching draft' });
  }
};

export const getAuthenticatedDraft = async (req, res) => {
  try {
    if (!requireControllerUser(req, res)) return;
    const workspace = await resolveWorkspaceOwner(req, 'viewDocuments');
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: 'You do not have permission to view this draft' });
    }

    const user = await User.findById(workspace.ownerUserId).lean();
    if (!user) return fail(res, { status: 404, message: 'Authenticated user was not found' });

    const draft = await ITRDraft.findOne({ userKey: userKeyInFilter(user) }).lean();
    const safeDraft = normalizeDraftForContext(draft);

    res.status(200).json({
      success: true,
      message: safeDraft ? 'Draft fetched successfully' : 'Draft not found',
      data: { draft: safeDraft },
      draft: safeDraft,
    });
  } catch (error) {
    logger.error('getAuthenticatedDraft error', error, {
      requestId: req.requestId,
      authenticated: Boolean(req.user?.id),
      service: 'ITR draft',
      queryError: sanitizeQueryError(error),
    });
    fail(res, {
      status: 500,
      message: 'Could not load ITR draft from MongoDB.',
      code: 'ITR_DRAFT_LOAD_FAILED',
      data: draftDiagnostics(req, 'ITR draft', error),
    });
  }
};

export const saveAuthenticatedDraft = async (req, res) => {
  try {
    if (!requireControllerUser(req, res)) return;
    const workspace = await resolveWorkspaceOwner(req, 'editDraft');
    if (!workspace.allowed) {
      return fail(res, { status: 403, message: 'You do not have permission to edit this draft' });
    }

    const user = await User.findById(workspace.ownerUserId).lean();
    if (!user) return fail(res, { status: 404, message: 'Authenticated user was not found' });

    const existingRaw = await ITRDraft.findOne({ userKey: userKeyInFilter(user) }).lean();
    const existing = normalizeDraftForContext(existingRaw);
    const payload = stripIdentityFields(req.body || {});
    const draft = await ITRDraft.findOneAndUpdate(
      { userKey: existing?.userKey || String(user._id) },
      {
        userKey: existing?.userKey || String(user._id),
        salary: payload.salary ?? existing?.salary ?? {},
        houseProperty: payload.houseProperty ?? existing?.houseProperty ?? {},
        pgbp: payload.pgbp ?? existing?.pgbp ?? {},
        capitalGains: payload.capitalGains ?? existing?.capitalGains ?? {},
        otherSources: payload.otherSources ?? existing?.otherSources ?? {},
        deductions: payload.deductions ?? existing?.deductions ?? {},
        taxpayerProfile: payload.taxpayerProfile ?? existing?.taxpayerProfile ?? {},
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    await recordAuditEvents(
      draftAuditEvents({
        userId: workspace.ownerUserId,
        draft,
        previous: existing || {},
        payload,
        sourceType: payload.sourceType === 'assistant' ? 'assistant' : 'manual',
      })
    );
    invalidateUserTaxContextCache(workspace.ownerUserId);

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: { draft },
      draft,
    });
  } catch (error) {
    logger.error('saveAuthenticatedDraft error', error, { requestId: req.requestId });
    fail(res, { status: 500, message: 'Server error while saving draft' });
  }
};
