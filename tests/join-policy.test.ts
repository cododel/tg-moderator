import { describe, expect, it } from "bun:test";
import { decideJoinRequest } from "@/join-policy";

const allowedStatuses = ["member", "administrator", "creator", "restricted"] as const;
const pendingStatuses = ["left", "kicked"] as const;

describe("decideJoinRequest", () => {
  for (const status of allowedStatuses) {
    it(`approves applicants whose required channel status is ${status}`, () => {
      expect(decideJoinRequest({ status })).toEqual({ action: "approve" });
    });
  }

  for (const status of pendingStatuses) {
    it(`keeps applicants pending when their required channel status is ${status}`, () => {
      expect(decideJoinRequest({ status })).toEqual({ action: "ignore", reason: "not_subscribed" });
    });
  }
});
