import assert from "node:assert/strict";
import { test } from "node:test";
import { tokenIssuedBeforePasswordChange } from "../src/services/authRules.js";

const at = (seconds) => new Date(seconds * 1000);

test("sans changement de mot de passe, le jeton reste valable", () => {
  assert.equal(tokenIssuedBeforePasswordChange(1_000, undefined), false);
});

test("un jeton émis avant le changement est refusé", () => {
  assert.equal(tokenIssuedBeforePasswordChange(999, at(1_000)), true);
});

test("le jeton émis dans la même seconde que le changement est accepté", () => {
  assert.equal(tokenIssuedBeforePasswordChange(1_000, at(1_000)), false);
  assert.equal(tokenIssuedBeforePasswordChange(1_000, new Date(1_000_999)), false);
});

test("un jeton émis après le changement est accepté", () => {
  assert.equal(tokenIssuedBeforePasswordChange(1_001, at(1_000)), false);
});
