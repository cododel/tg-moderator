export type ChannelMemberStatus = "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";

export type JoinDecision =
  | { action: "approve" }
  | { action: "ignore"; reason: "not_subscribed" };

export function decideJoinRequest(member: { status: ChannelMemberStatus }): JoinDecision {
  if (["member", "administrator", "creator", "restricted"].includes(member.status)) {
    return { action: "approve" };
  }

  return { action: "ignore", reason: "not_subscribed" };
}
