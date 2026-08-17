function messageTimestamp(message = {}) {
  const raw = message.at || message.timestamp || message.createdAt || message.created_at;
  const parsed = new Date(raw || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeSecurityMessage(incomingMessage = null) {
  if (!incomingMessage) return null;

  const sessionId = String(incomingMessage.sessionId || incomingMessage.session_id || "").trim();
  const createdAt = incomingMessage.at || incomingMessage.timestamp || incomingMessage.createdAt || incomingMessage.created_at || new Date().toISOString();
  const senderType = incomingMessage.senderType || incomingMessage.senderRole || incomingMessage.sender_role || incomingMessage.role || incomingMessage.sender_type || "visitor";
  const mediaUrl = String(
    incomingMessage.mediaUrl
    || incomingMessage.media_url
    || incomingMessage.snapshotUrl
    || incomingMessage.snapshot_url
    || incomingMessage.photoUrl
    || incomingMessage.photo_url
    || incomingMessage.imageUrl
    || incomingMessage.image_url
    || incomingMessage.fileUrl
    || incomingMessage.file_url
    || incomingMessage.url
    || ""
  ).trim();
  const messageType = incomingMessage.messageType || incomingMessage.message_type || incomingMessage.type || incomingMessage.kind || "text";
  const isSnapshot = messageType === "snapshot" || messageType === "visitor_snapshot" || incomingMessage.kind === "snapshot" || Boolean(mediaUrl);

  return {
    ...incomingMessage,
    id: outgoingMessageId(incomingMessage),
    text: String(incomingMessage.text ?? incomingMessage.content ?? incomingMessage.body ?? incomingMessage.message ?? "").trim(),
    at: createdAt,
    timestamp: incomingMessage.timestamp || createdAt,
    createdAt,
    created_at: incomingMessage.created_at || createdAt,
    type: isSnapshot ? "snapshot" : incomingMessage.type,
    kind: isSnapshot ? "snapshot" : incomingMessage.kind,
    messageType: isSnapshot ? "visitor_snapshot" : messageType,
    mediaUrl,
    media_url: incomingMessage.media_url || mediaUrl,
    snapshotUrl: incomingMessage.snapshotUrl || incomingMessage.snapshot_url || mediaUrl,
    snapshot_url: incomingMessage.snapshot_url || incomingMessage.snapshotUrl || mediaUrl,
    photoUrl: incomingMessage.photoUrl || incomingMessage.photo_url || mediaUrl,
    photo_url: incomingMessage.photo_url || incomingMessage.photoUrl || mediaUrl,
    senderType,
    senderRole: incomingMessage.senderRole || incomingMessage.sender_role || senderType,
    senderId: incomingMessage.senderId || incomingMessage.sender_id || null,
    sessionId
  };
}

export function mergeSecurityMessages(existingMessages = [], incomingMessages = []) {
  const next = Array.isArray(existingMessages) ? [...existingMessages] : [];
  const messages = Array.isArray(incomingMessages) ? incomingMessages : [incomingMessages];

  for (const incomingMessage of messages) {
    const message = normalizeSecurityMessage(incomingMessage);
    if (!message || !message.sessionId) continue;

    const incomingId = String(message.id || message.clientId || "").trim();
    const existingIndex = next.findIndex((item) => {
      const currentId = String(item?.id || item?.clientId || "").trim();
      if (currentId && incomingId && currentId === incomingId) return true;
      const currentClientId = String(item?.clientId || "").trim();
      const incomingClientId = String(message.clientId || "").trim();
      return currentClientId && incomingClientId && currentClientId === incomingClientId;
    });

    if (existingIndex >= 0) {
      next[existingIndex] = { ...next[existingIndex], ...message };
    } else {
      next.push(message);
    }
  }

  return next.sort((left, right) => messageTimestamp(left) - messageTimestamp(right));
}

export function mergeRealtimeMessageIntoConversation(existingMessages = [], incomingMessage = null) {
  const message = normalizeSecurityMessage(incomingMessage);
  if (!message || !message.sessionId) return existingMessages;
  return mergeSecurityMessages(existingMessages, message);
}

export function outgoingMessageId(incomingMessage = {}) {
  return String(incomingMessage.id || incomingMessage.clientId || `realtime-${Date.now()}-${Math.random()}`).trim();
}

export function normalizeRealtimeMessage(incomingMessage = null) {
  return normalizeSecurityMessage(incomingMessage);
}

function getThreadSessionId(thread = {}) {
  return String(thread.session_id || thread.sessionId || thread.visitor_session_id || thread.visitorSessionId || thread.id || "").trim();
}

export function updateThreadFromRealtimeMessage(threadRows = [], incomingMessage = null, activeThreadId = null) {
  const message = normalizeRealtimeMessage(incomingMessage);
  if (!message || !message.sessionId) return threadRows;

  const sessionId = String(message.sessionId || "");
  const text = String(message.text || "").trim() || "New message";
  const at = message.at || new Date().toISOString();

  return [...(Array.isArray(threadRows) ? threadRows : [])]
    .map((thread) => {
      if (getThreadSessionId(thread) !== sessionId) return thread;
      const isActive = String(activeThreadId || "") === sessionId;
      return {
        ...thread,
        last: text,
        updatedAt: at,
        unread: isActive ? Number(thread?.unread || 0) : Number(thread?.unread || 0) + 1,
        lastMessageAt: at,
        preview: text
      };
    })
    .sort((left, right) => new Date(right?.updatedAt || 0).getTime() - new Date(left?.updatedAt || 0).getTime());
}
