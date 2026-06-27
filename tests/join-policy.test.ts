import { describe, expect, it } from "vitest";
import { decideJoinRequest } from "../src/join-policy.js";

const allowedStatuses = ["member", "administrator", "creator"] as const;
const rejectedStatuses = ["left", "kicked", "restricted"] as const;

describe("decideJoinRequest", () => {
  for (const status of allowedStatuses) {
    it(`approves applicants whose required channel status is ${status}`, () => {
      expect(decideJoinRequest({ status })).toEqual({ action: "approve" });
    });
  }

  for (const status of rejectedStatuses) {
    it(`declines applicants whose required channel status is ${status}`, () => {
      expect(decideJoinRequest({ status })).toEqual({ action: "decline" });
    });
  }
});
