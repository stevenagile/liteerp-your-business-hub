import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { withAuthTimeout } from "./auth-loading";

describe("authentication loading", () => {
  test("returns a completed session read", async () => {
    assert.equal(await withAuthTimeout(Promise.resolve("session"), 50), "session");
  });
  test("a stalled read rejects instead of leaving loading pending", async () => {
    await assert.rejects(withAuthTimeout(new Promise(() => {}), 5), /登入資料讀取逾時/);
  });
  test("preserves request failures", async () => {
    await assert.rejects(withAuthTimeout(Promise.reject(new Error("offline")), 50), /offline/);
  });
});