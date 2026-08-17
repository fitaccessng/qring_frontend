import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

const password = "Password123!";
const apiBase = process.env.E2E_API_BASE || "http://127.0.0.1:8102/api/v1";
const dbPath = path.join(import.meta.dirname, "..", "..", "test-results", "qring-fullstack-e2e.db");
const emails = {
  starterResident: "e2e.starter.resident@qring-e2e.com",
  starterGuard: "e2e.starter.guard@qring-e2e.com",
  otherGuard: "e2e.other.guard@qring-e2e.com",
};

async function login(request, email) {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data;
}

async function api(request, session, method, route, data) {
  const response = await request[method](`${apiBase}${route}`, {
    data,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { response, body };
}

async function installBrowserSession(page, session) {
  await page.goto("/");
  await page.evaluate((auth) => {
    sessionStorage.setItem("qring_access_token", auth.accessToken);
    sessionStorage.setItem("qring_refresh_token", auth.refreshToken || "");
    sessionStorage.setItem("qring_user", JSON.stringify(auth.user));
  }, session);
}

async function registerVisitorSession(request, guardSession, name) {
  const doors = await api(request, guardSession, "get", "/security/door-options");
  expect(doors.response.ok(), JSON.stringify(doors.body)).toBeTruthy();
  expect(doors.body.data.length).toBeGreaterThan(0);

  const registered = await api(request, guardSession, "post", "/security/requests/register", {
    name,
    purpose: "Live security messaging verification",
    visitorType: "guest",
    phoneNumber: "08030000001",
    doorId: doors.body.data[0].id,
    snapshotBase64: Buffer.from("live-security-message-test").toString("base64"),
    snapshotMime: "image/jpeg",
  });
  expect(registered.response.ok(), JSON.stringify(registered.body)).toBeTruthy();
  return String(registered.body.data.id);
}

function readMessageFromDb(text) {
  const script = `
import json, sqlite3, sys
db_path, message_text = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
row = conn.execute("""
SELECT m.id AS message_id, m.session_id, vs.estate_id, m.sender_type, m.sender_id, m.receiver_id, m.body, m.created_at
FROM messages m
JOIN visitor_sessions vs ON vs.id = m.session_id
WHERE m.body = ?
ORDER BY m.created_at DESC
LIMIT 1
""", (message_text,)).fetchone()
print(json.dumps(dict(row) if row else None))
`;
  return JSON.parse(execFileSync("python3", ["-c", script, dbPath, text], { encoding: "utf8" }));
}

function readSessionFromDb(sessionId) {
  const script = `
import json, sqlite3, sys
db_path, session_id = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
row = conn.execute("""
SELECT id AS session_id, estate_id, handled_by_security_id, homeowner_id, visitor_label, purpose
FROM visitor_sessions
WHERE id = ?
""", (session_id,)).fetchone()
message_count = conn.execute("SELECT COUNT(*) FROM messages WHERE session_id = ?", (session_id,)).fetchone()[0]
data = dict(row) if row else None
if data is not None:
    data["message_count"] = message_count
print(json.dumps(data))
`;
  return JSON.parse(execFileSync("python3", ["-c", script, dbPath, sessionId], { encoding: "utf8" }));
}

function readSessionMessageHistoryFromDb(sessionId) {
  const script = `
import json, sqlite3, sys
db_path, session_id = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
session = conn.execute("""
SELECT id AS session_id, estate_id, handled_by_security_id
FROM visitor_sessions
WHERE id = ?
""", (session_id,)).fetchone()
rows = conn.execute("""
SELECT id, sender_type, sender_id, receiver_id, body, created_at
FROM messages
WHERE session_id = ?
ORDER BY created_at ASC
""", (session_id,)).fetchall()
print(json.dumps({
  "session": dict(session) if session else None,
  "message_count": len(rows),
  "oldest": dict(rows[0]) if rows else None,
  "newest": dict(rows[-1]) if rows else None,
  "messages": [dict(row) for row in rows],
}))
`;
  return JSON.parse(execFileSync("python3", ["-c", script, dbPath, sessionId], { encoding: "utf8" }));
}

async function sendHomeownerMessageFromBrowser(homeownerPage, sessionId, text) {
  return homeownerPage.evaluate(async ({ apiBaseUrl, targetSessionId, bodyText }) => {
    const token = sessionStorage.getItem("qring_access_token");
    const response = await fetch(`${apiBaseUrl}/homeowner/messages/${encodeURIComponent(targetSessionId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: bodyText }),
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, body: json };
  }, { apiBaseUrl: apiBase, targetSessionId: sessionId, bodyText: text });
}

test("live homeowner to security messaging verifies REST, realtime, refresh, reconnect, and estate isolation", async ({ browser, request }) => {
  const resident = await login(request, emails.starterResident);
  const guard = await login(request, emails.starterGuard);
  const otherGuard = await login(request, emails.otherGuard);

  const securityContext = await browser.newContext();
  const homeownerContext = await browser.newContext();
  const otherSecurityContext = await browser.newContext();
  const securityPage = await securityContext.newPage();
  const homeownerPage = await homeownerContext.newPage();
  const otherSecurityPage = await otherSecurityContext.newPage();

  const securityLogs = [];
  const otherSecurityLogs = [];
  securityPage.on("console", (message) => securityLogs.push(message.text()));
  otherSecurityPage.on("console", (message) => otherSecurityLogs.push(message.text()));

  await installBrowserSession(securityPage, guard);
  await installBrowserSession(homeownerPage, resident);
  await installBrowserSession(otherSecurityPage, otherGuard);

  const sessionId = await registerVisitorSession(request, guard, "Live Message Visitor 001");
  await securityPage.goto(`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`);
  await expect(securityPage.locator("body")).toContainText(/Security Inbox|Threads/i);
  await expect(securityPage.locator("body")).toContainText(/Live Message Visitor 001|Visitor/i);
  await expect.poll(() => securityLogs.some((line) => line.includes("socket joinSession") && line.includes(sessionId))).toBe(true);
  await expect.poll(() => securityLogs.some((line) => line.includes("qring.security.messages.socket") && line.includes("connected") && line.includes("session:"))).toBe(true);

  const socketState = await request.get(`${apiBase}/health`);
  expect(socketState.ok()).toBeTruthy();
  const health = await socketState.json();
  expect(health.data?.realtimeRuntime?.websocketInitialized ?? health.realtimeRuntime?.websocketInitialized).toBeTruthy();

  const firstText = "LIVE SECURITY MESSAGE TEST 001";
  const firstPost = await sendHomeownerMessageFromBrowser(homeownerPage, sessionId, firstText);
  expect(firstPost.ok, JSON.stringify(firstPost)).toBeTruthy();
  const firstMessageId = firstPost.body.data.id || firstPost.body.data.messageId;
  expect(firstMessageId).toBeTruthy();

  const firstDbMessage = readMessageFromDb(firstText);
  expect(firstDbMessage).toMatchObject({
    message_id: firstMessageId,
    session_id: sessionId,
    sender_type: "homeowner",
    body: firstText,
  });

  await expect.poll(() => securityLogs.some((line) => line.includes("socket incoming chat.message") && line.includes(firstMessageId))).toBe(true);
  await expect.poll(() => securityLogs.some((line) => line.includes("qring.security.message.received") && line.includes(firstMessageId))).toBe(true);
  await expect(securityPage.locator("body")).toContainText(firstText);
  await expect(securityPage.getByTestId("security-message-list").getByTestId("security-message-text").filter({ hasText: firstText })).toHaveCount(1);

  await securityPage.reload();
  await expect(securityPage.locator("body")).toContainText(firstText);
  const securityThreads = await api(request, guard, "get", "/security/messages");
  expect(securityThreads.response.ok(), JSON.stringify(securityThreads.body)).toBeTruthy();
  expect(JSON.stringify(securityThreads.body.data)).toContain(firstText);

  const inactiveSessionId = await registerVisitorSession(request, guard, "Live Message Visitor 002");
  await securityPage.goto(`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`);
  await expect(securityPage.locator("body")).toContainText(firstText);
  await expect.poll(() => securityLogs.some((line) => line.includes("qring.socket.connected") && line.includes("/realtime/dashboard"))).toBe(true);
  const zeroMessageText = "SECURITY REQUEST DEBUG 001";
  const zeroMessageSessionId = await registerVisitorSession(request, guard, zeroMessageText);
  const zeroMessageSession = readSessionFromDb(zeroMessageSessionId);
  expect(zeroMessageSession).toMatchObject({
    session_id: zeroMessageSessionId,
    handled_by_security_id: guard.user.id,
    homeowner_id: resident.user.id,
    visitor_label: zeroMessageText,
    message_count: 0,
  });
  expect(zeroMessageSession.estate_id).toBeTruthy();
  const zeroMessageThreads = await api(request, guard, "get", "/security/messages");
  expect(zeroMessageThreads.response.ok(), JSON.stringify(zeroMessageThreads.body)).toBeTruthy();
  expect(JSON.stringify(zeroMessageThreads.body.data)).toContain(zeroMessageSessionId);
  await expect.poll(() => securityLogs.some((line) => line.includes("qring.security.messages.request.created") && line.includes(zeroMessageSessionId))).toBe(true);
  await expect(securityPage.locator("body")).toContainText(zeroMessageText);
  await securityPage.reload();
  await expect(securityPage.locator("body")).toContainText(zeroMessageText);

  const historySessionId = await registerVisitorSession(request, guard, "History Debug Visitor 004");
  const historyTexts = ["History Message 1", "History Message 2", "History Message 3"];
  const historySecurityPost = await api(request, guard, "post", `/security/messages/${encodeURIComponent(historySessionId)}`, { text: historyTexts[0] });
  expect(historySecurityPost.response.ok(), JSON.stringify(historySecurityPost.body)).toBeTruthy();
  const historyHomeownerPost = await api(request, resident, "post", `/homeowner/messages/${encodeURIComponent(historySessionId)}`, { text: historyTexts[1] });
  expect(historyHomeownerPost.response.ok(), JSON.stringify(historyHomeownerPost.body)).toBeTruthy();
  const historySecurityPostTwo = await api(request, guard, "post", `/security/messages/${encodeURIComponent(historySessionId)}`, { text: historyTexts[2] });
  expect(historySecurityPostTwo.response.ok(), JSON.stringify(historySecurityPostTwo.body)).toBeTruthy();

  const historyDb = readSessionMessageHistoryFromDb(historySessionId);
  expect(historyDb.session?.session_id).toBe(historySessionId);
  expect(historyDb.message_count).toBe(3);
  expect(historyDb.oldest?.body).toBe(historyTexts[0]);
  expect(historyDb.newest?.body).toBe(historyTexts[2]);

  const historyApi = await api(request, guard, "get", `/security/messages/${encodeURIComponent(historySessionId)}`);
  expect(historyApi.response.ok(), JSON.stringify(historyApi.body)).toBeTruthy();
  const returnedHistoryTexts = (historyApi.body.data || []).map((message) => message.text || message.body || message.content);
  for (const text of historyTexts) expect(returnedHistoryTexts).toContain(text);
  expect(returnedHistoryTexts.indexOf(historyTexts[0])).toBeLessThan(returnedHistoryTexts.indexOf(historyTexts[2]));

  await securityPage.goto(`/dashboard/security/messages?sessionId=${encodeURIComponent(historySessionId)}`);
  for (const text of historyTexts) {
    await expect(securityPage.getByTestId("security-message-list").getByTestId("security-message-text").filter({ hasText: text })).toHaveCount(1);
  }
  const historyAppendText = "HISTORY DEBUG 004";
  const historyAppendPost = await sendHomeownerMessageFromBrowser(homeownerPage, historySessionId, historyAppendText);
  expect(historyAppendPost.ok, JSON.stringify(historyAppendPost)).toBeTruthy();
  for (const text of [...historyTexts, historyAppendText]) {
    await expect(securityPage.getByTestId("security-message-list").getByTestId("security-message-text").filter({ hasText: text })).toHaveCount(1);
  }
  await securityPage.reload();
  for (const text of [...historyTexts, historyAppendText]) {
    await expect(securityPage.getByTestId("security-message-list").getByTestId("security-message-text").filter({ hasText: text })).toHaveCount(1);
  }

  const secondText = "LIVE SECURITY MESSAGE TEST 002";
  const secondPost = await sendHomeownerMessageFromBrowser(homeownerPage, inactiveSessionId, secondText);
  expect(secondPost.ok, JSON.stringify(secondPost)).toBeTruthy();
  await expect.poll(async () => {
    const threads = await api(request, guard, "get", "/security/messages");
    return JSON.stringify(threads.body.data).includes(secondText);
  }).toBe(true);
  await securityPage.goto(`/dashboard/security/messages?sessionId=${encodeURIComponent(inactiveSessionId)}`);
  await expect(securityPage.locator("body")).toContainText(secondText);
  await expect(securityPage.getByTestId("security-message-list").getByTestId("security-message-text").filter({ hasText: secondText })).toHaveCount(1);

  const joinLogsBeforeReload = securityLogs.filter((line) => line.includes("socket joinSession") && line.includes(inactiveSessionId)).length;
  const socketLogsBeforeReload = securityLogs.filter((line) => line.includes("qring.security.messages.socket") && line.includes(inactiveSessionId)).length;
  await securityPage.reload();
  await expect.poll(() => securityLogs.filter((line) => line.includes("socket joinSession") && line.includes(inactiveSessionId)).length).toBeGreaterThan(joinLogsBeforeReload);
  await expect.poll(() => securityLogs.filter((line) => line.includes("qring.security.messages.socket") && line.includes(inactiveSessionId)).length).toBeGreaterThan(socketLogsBeforeReload);
  const thirdText = "LIVE SECURITY MESSAGE TEST 003";
  const thirdPost = await sendHomeownerMessageFromBrowser(homeownerPage, inactiveSessionId, thirdText);
  expect(thirdPost.ok, JSON.stringify(thirdPost)).toBeTruthy();
  const thirdMessageId = thirdPost.body.data.id || thirdPost.body.data.messageId;
  await expect.poll(() => securityLogs.some((line) => line.includes("socket incoming chat.message") && line.includes(thirdMessageId))).toBe(true);
  await expect(securityPage.locator("body")).toContainText(thirdText);

  await otherSecurityPage.goto("/dashboard/security/messages");
  await expect(otherSecurityPage.locator("body")).toContainText(/Security Inbox|Threads|No active threads/i);
  const otherThreads = await api(request, otherGuard, "get", "/security/messages");
  expect(otherThreads.response.ok(), JSON.stringify(otherThreads.body)).toBeTruthy();
  expect(JSON.stringify(otherThreads.body.data)).not.toContain(firstText);
  expect(otherSecurityLogs.join("\n")).not.toContain(firstMessageId);

  console.log(JSON.stringify({
    firstPost: { status: firstPost.status, sessionId, messageId: firstMessageId },
    db: firstDbMessage,
    registeredRequest: {
      sessionId: zeroMessageSessionId,
      estateId: zeroMessageSession.estate_id,
      securityId: zeroMessageSession.handled_by_security_id,
      homeownerId: zeroMessageSession.homeowner_id,
      messageCount: zeroMessageSession.message_count,
      visibleInSecurityMessages: true,
    },
    history: {
      sessionId: historySessionId,
      estateId: historyDb.session?.estate_id,
      securityGuardId: historyDb.session?.handled_by_security_id,
      messageCountInDb: historyDb.message_count,
      oldestMessageCreatedAt: historyDb.oldest?.created_at,
      newestMessageCreatedAt: historyDb.newest?.created_at,
      apiMessagesReturned: historyApi.body.data?.length || 0,
      apiOldestReturnedMessage: historyApi.body.data?.[0]?.text || null,
      apiNewestReturnedMessage: historyApi.body.data?.[(historyApi.body.data?.length || 1) - 1]?.text || null,
      realtimeAppendPreservedHistory: true,
      refreshPreservedHistory: true,
    },
    socket: securityLogs.find((line) => line.includes("qring.security.messages.socket") && line.includes(sessionId)) || null,
    browserReceived: securityLogs.find((line) => line.includes("qring.security.message.received") && line.includes(firstMessageId)) || null,
    realtime: {
      messageId: firstMessageId,
      event: "chat.message",
      room: `session:${sessionId}`,
      securityJoinedRoom: `session:${sessionId}`,
      frontendListener: "RealtimeEvent.CHAT_MESSAGE",
    },
    refreshReturnedMessage: true,
    inactiveThreadUpdated: true,
    reconnectReceivedMessage: true,
    crossEstateBlocked: true,
  }, null, 2));

  await securityContext.close();
  await homeownerContext.close();
  await otherSecurityContext.close();
});
