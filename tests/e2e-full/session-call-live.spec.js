import { expect, test } from "@playwright/test";

const password = "Password123!";
const apiBase = process.env.E2E_API_BASE || "http://127.0.0.1:8102/api/v1";
const emails = {
  resident: "e2e.starter.resident@qring-e2e.com",
  guard: "e2e.starter.guard@qring-e2e.com",
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

async function dismissUpdateToast(page) {
  const dismiss = page.getByRole("button", { name: /^dismiss$/i });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
  await page.evaluate(() => {
    for (const node of document.querySelectorAll("div.fixed")) {
      if (node.textContent?.includes("Update ready")) node.style.pointerEvents = "none";
    }
  });
}

async function registerVisitorSession(request, guardSession, name) {
  const doors = await api(request, guardSession, "get", "/security/door-options");
  expect(doors.response.ok(), JSON.stringify(doors.body)).toBeTruthy();

  const registered = await api(request, guardSession, "post", "/security/requests/register", {
    name,
    purpose: "Live call verification",
    visitorType: "guest",
    phoneNumber: "08030000001",
    doorId: doors.body.data[0].id,
    snapshotBase64: Buffer.from("live-call-test").toString("base64"),
    snapshotMime: "image/jpeg",
  });
  expect(registered.response.ok(), JSON.stringify(registered.body)).toBeTruthy();
  return String(registered.body.data.id);
}

async function installRtcProbe(context) {
  await context.addInitScript(() => {
    window.__qringRtcProbe = { peers: [], offers: 0, answers: 0, localCandidates: 0 };
    const NativeRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function RTCPeerConnectionProbe(...args) {
      const pc = new NativeRTCPeerConnection(...args);
      window.__qringRtcProbe.peers.push(pc);
      const nativeCreateOffer = pc.createOffer.bind(pc);
      pc.createOffer = async (...offerArgs) => {
        window.__qringRtcProbe.offers += 1;
        return nativeCreateOffer(...offerArgs);
      };
      const nativeCreateAnswer = pc.createAnswer.bind(pc);
      pc.createAnswer = async (...answerArgs) => {
        window.__qringRtcProbe.answers += 1;
        return nativeCreateAnswer(...answerArgs);
      };
      pc.addEventListener("icecandidate", (event) => {
        if (event.candidate) window.__qringRtcProbe.localCandidates += 1;
      });
      return pc;
    };
    window.RTCPeerConnection.prototype = NativeRTCPeerConnection.prototype;
    window.RTCPeerConnection.generateCertificate = NativeRTCPeerConnection.generateCertificate?.bind(NativeRTCPeerConnection);
  });
}

function collectConsole(page, bucket) {
  page.on("console", (message) => bucket.push(message.text()));
}

async function getRtcState(page) {
  return page.evaluate(() => ({
    peers: window.__qringRtcProbe?.peers?.length || 0,
    offers: window.__qringRtcProbe?.offers || 0,
    answers: window.__qringRtcProbe?.answers || 0,
    localCandidates: window.__qringRtcProbe?.localCandidates || 0,
    connectionState: window.__qringRtcProbe?.peers?.[0]?.connectionState || "",
    iceConnectionState: window.__qringRtcProbe?.peers?.[0]?.iceConnectionState || "",
    localAudioTracks: window.__qringRtcProbe?.peers?.[0]?.getSenders?.().filter((sender) => sender.track?.kind === "audio").length || 0,
    localVideoTracks: window.__qringRtcProbe?.peers?.[0]?.getSenders?.().filter((sender) => sender.track?.kind === "video").length || 0,
    remoteAudioTracks: window.__qringRtcProbe?.peers?.[0]?.getReceivers?.().filter((receiver) => receiver.track?.kind === "audio").length || 0,
    remoteVideoTracks: window.__qringRtcProbe?.peers?.[0]?.getReceivers?.().filter((receiver) => receiver.track?.kind === "video").length || 0,
    remoteAudioElement: Array.from(document.querySelectorAll("audio")).some((element) => Boolean(element.srcObject)),
    remoteAudioMuted: Array.from(document.querySelectorAll("audio")).find((element) => Boolean(element.srcObject))?.muted ?? null,
  }));
}

test("live homeowner to security audio call reaches remote media", async ({ browser, request }) => {
  const resident = await login(request, emails.resident);
  const guard = await login(request, emails.guard);
  const sessionId = await registerVisitorSession(request, guard, "Live Call Visitor 001");

  const homeownerContext = await browser.newContext({ permissions: ["notifications", "microphone", "camera"] });
  const securityContext = await browser.newContext({ permissions: ["notifications", "microphone", "camera"] });
  await installRtcProbe(homeownerContext);
  await installRtcProbe(securityContext);

  const homeownerPage = await homeownerContext.newPage();
  const securityPage = await securityContext.newPage();
  const homeownerLogs = [];
  const securityLogs = [];
  collectConsole(homeownerPage, homeownerLogs);
  collectConsole(securityPage, securityLogs);

  await installBrowserSession(homeownerPage, resident);
  await installBrowserSession(securityPage, guard);
  await securityPage.goto(`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`);
  await homeownerPage.goto(`/dashboard/homeowner/messages?sessionId=${encodeURIComponent(sessionId)}`);
  await dismissUpdateToast(securityPage);
  await dismissUpdateToast(homeownerPage);

  await expect(securityPage.locator("body")).toContainText(/Live Call Visitor 001|Visitor/i);
  await expect(homeownerPage.locator("body")).toContainText(/Live Call Visitor 001|Visitor/i);

  const startResponse = homeownerPage.waitForResponse(
    (response) => response.url().includes("/calls/start") && response.request().method() === "POST",
    { timeout: 10_000 },
  );
  await homeownerPage.getByRole("button", { name: /audio call/i }).click();
  expect((await startResponse).ok()).toBeTruthy();

  await expect.poll(() => securityLogs.some((line) => line.includes("qring.call.incoming.received")) || securityLogs.some((line) => line.includes("Incoming Call"))).toBeTruthy();
  const acceptButton = securityPage.getByRole("button", { name: /accept/i }).first();
  await expect(acceptButton).toBeVisible();
  await acceptButton.click();

  await expect.poll(() => securityLogs.some((line) => line.includes("qring.webrtc.accept_intent.replayed"))).toBeTruthy();
  await expect.poll(() => securityLogs.some((line) => line.includes("qring.webrtc.call.accepted"))).toBeTruthy();
  await expect.poll(async () => (await getRtcState(homeownerPage)).peers).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await getRtcState(securityPage)).peers).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await getRtcState(homeownerPage)).remoteAudioTracks).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await getRtcState(securityPage)).remoteAudioTracks).toBeGreaterThanOrEqual(1);
  try {
    await expect.poll(async () => (await getRtcState(homeownerPage)).remoteAudioElement).toBeTruthy();
  } catch (error) {
    console.log("homeowner rtc state", await getRtcState(homeownerPage));
    console.log("homeowner url", homeownerPage.url());
    console.log("homeowner call logs", homeownerLogs.filter((line) => /webrtc|Offer|Answer|ICE|Remote|qring\.call|SOCKET EVENT/.test(line)).slice(-80));
    console.log("security call logs", securityLogs.filter((line) => /webrtc|Offer|Answer|ICE|Remote|qring\.call|SOCKET EVENT/.test(line)).slice(-80));
    console.log("homeowner audio elements", await homeownerPage.evaluate(() => Array.from(document.querySelectorAll("audio")).map((element) => ({
      hasSrcObject: Boolean(element.srcObject),
      muted: element.muted,
      autoplay: element.autoplay,
      outerHTML: element.outerHTML,
    }))));
    throw error;
  }
  await expect.poll(async () => (await getRtcState(securityPage)).remoteAudioElement).toBeTruthy();

  await homeownerPage.getByRole("button", { name: /end call/i }).click();
  await expect.poll(async () => (await getRtcState(homeownerPage)).connectionState).toBe("closed");
});
