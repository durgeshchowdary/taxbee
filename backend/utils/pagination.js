const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export const parsePagination = (query = {}, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) => {
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = Math.max(Number(query.skip) || (page - 1) * limit, 0);
  return { page, limit, skip };
};

export const pageResult = (items = [], { page, limit, skip }) => {
  const hasNext = items.length > limit;
  return {
    items: hasNext ? items.slice(0, limit) : items,
    pagination: {
      page,
      limit,
      skip,
      hasNext,
      nextPage: hasNext ? page + 1 : null,
    },
  };
};
