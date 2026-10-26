import { describe, expect, test } from "bun:test";
import { withAuthTimeout } from "./auth-loading";

describe("authentication loading", () => {
  test("returns a completed session read", async () => {
    expect(await withAuthTimeout(Promise.resolve("session"), 50)).toBe("session");
  });
  test("a stalled read rejects instead of leaving loading pending", async () => {
    await expect(withAuthTimeout(new Promise(() => {}), 5)).rejects.toThrow("登入資料讀取逾時");
  });
  test("preserves request failures", async () => {
    await expect(withAuthTimeout(Promise.reject(new Error("offline")), 50)).rejects.toThrow("offline");
  });
});