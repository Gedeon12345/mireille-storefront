import assert from "node:assert/strict";
import { test } from "node:test";
import { getStockStatus } from "../src/utils/stock.js";

test("statut de stock selon la quantité", () => {
  assert.equal(getStockStatus(0), "out-of-stock");
  assert.equal(getStockStatus(3), "low-stock");
  assert.equal(getStockStatus(5), "low-stock");
  assert.equal(getStockStatus(6), "in-stock");
});
