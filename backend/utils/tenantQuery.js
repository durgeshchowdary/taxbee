export const getTenantUserId = (req) => req.user?._id || req.user?.id;

export const withTenant = (req, filter = {}) => ({
  ...filter,
  userId: getTenantUserId(req),
});

export const assertTenantOwnership = (req, document) => {
  const userId = String(getTenantUserId(req) || "");
  const ownerId = String(document?.userId || document?.user || "");

  return Boolean(userId && ownerId && userId === ownerId);
};