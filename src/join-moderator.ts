import { decideJoinRequest, type ChannelMemberStatus, type JoinDecision } from "./join-policy.js";

export type JoinRequestRef = {
  chatId: string | number;
  userId: number;
};

export type JoinModerationApi = {
  getChatMember(chatId: string | number, userId: number): Promise<{ status: ChannelMemberStatus }>;
  approveChatJoinRequest(chatId: string | number, userId: number): Promise<unknown>;
};

export type ModerateJoinRequestInput = {
  api: JoinModerationApi;
  requiredChannelId: string | number;
  targetGroupId?: string | number;
  request: JoinRequestRef;
};

export type JoinModerationResult =
  | (JoinDecision & {
      channelStatus: ChannelMemberStatus;
      lookupError?: "user_not_found";
    })
  | { action: "ignore"; reason: "wrong_chat" };

function isUserNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const description = "description" in error ? String(error.description) : "";
  return /user not found/i.test(description);
}

export async function moderateJoinRequest({
  api,
  requiredChannelId,
  targetGroupId,
  request
}: ModerateJoinRequestInput): Promise<JoinModerationResult> {
  if (targetGroupId !== undefined && request.chatId !== targetGroupId) {
    return { action: "ignore", reason: "wrong_chat" };
  }

  let member: { status: ChannelMemberStatus };
  let lookupError: "user_not_found" | undefined;

  try {
    member = await api.getChatMember(requiredChannelId, request.userId);
  } catch (error) {
    if (!isUserNotFoundError(error)) {
      throw error;
    }

    member = { status: "left" };
    lookupError = "user_not_found";
  }

  const decision = decideJoinRequest(member);

  if (decision.action === "approve") {
    await api.approveChatJoinRequest(request.chatId, request.userId);
  }

  console.info("moderateJoinRequest", {
    userId: request.userId,
    chatId: request.chatId,
    action: decision.action,
    reason: "reason" in decision ? decision.reason : undefined,
    channelStatus: member.status,
    lookupError
  });

  return { ...decision, channelStatus: member.status, ...(lookupError ? { lookupError } : {}) };
}
