import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/utils/password.js";

test("un mot de passe correct est reconnu, un mauvais est refusé", async () => {
  const hash = await hashPassword("Correct-Horse-1");
  assert.equal(await verifyPassword("Correct-Horse-1", hash), true);
  assert.equal(await verifyPassword("correct-horse-1", hash), false);
  assert.equal(await verifyPassword("", hash), false);
});

test("le haché ne contient pas le mot de passe et change à chaque appel (sel aléatoire)", async () => {
  const [first, second] = await Promise.all([hashPassword("Secret-123"), hashPassword("Secret-123")]);
  assert.notEqual(first, second);
  assert.ok(first.startsWith("scrypt$15$8$1$"));
  assert.ok(!first.includes("Secret-123"));
  assert.equal(await verifyPassword("Secret-123", second), true);
});

test("un haché mal formé est refusé sans planter", async () => {
  assert.equal(await verifyPassword("x", "n-importe-quoi"), false);
  assert.equal(await verifyPassword("x", "bcrypt$1$2$3$4$5"), false);
});

test("les caractères accentués sont normalisés (é composé ou décomposé)", async () => {
  const hash = await hashPassword("caf\u00e9-Motdepasse1");
  assert.equal(await verifyPassword("cafe\u0301-Motdepasse1", hash), true);
});
