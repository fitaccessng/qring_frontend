export function getConversationMessageText(message) {
  return String(
    message?.text ||
      message?.body ||
      message?.message ||
      message?.lastMessageText ||
      message?.lastMessage ||
      message?.last ||
      ""
  ).trim();
}

export function getConversationPreviewText(message, options = {}) {
  const emptyLabel = options.emptyLabel || "No message text yet.";
  const conversationText = getConversationMessageText(message);
  if (conversationText) return conversationText;

  const status = String(message?.status || "").trim().toLowerCase();
  if (status) {
    return status === "pending"
      ? "Visitor request received. Open the thread to reply."
      : `Conversation status: ${status}`;
  }

  const purpose = String(message?.purpose || "").trim();
  if (purpose) return purpose;

  return emptyLabel;
}
