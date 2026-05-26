import assert from "node:assert/strict";
import test from "node:test";
import { pageResult, parsePagination } from "./pagination.js";

test("parsePagination clamps unsafe limits and calculates skip", () => {
  const pagination = parsePagination({ page: "3", limit: "999" }, { defaultLimit: 25, maxLimit: 100 });

  assert.deepEqual(pagination, { page: 3, limit: 100, skip: 200 });
});

test("pageResult trims lookahead item and exposes next page", () => {
  const result = pageResult([1, 2, 3], { page: 1, limit: 2, skip: 0 });

  assert.deepEqual(result.items, [1, 2]);
  assert.equal(result.pagination.hasNext, true);
  assert.equal(result.pagination.nextPage, 2);
});
