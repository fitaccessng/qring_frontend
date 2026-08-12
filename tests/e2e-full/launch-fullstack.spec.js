import { expect, test } from "@playwright/test";

const password = "Password123!";
const apiBase = process.env.E2E_API_BASE || "http://127.0.0.1:8102/api/v1";
const emails = {
  manager: "e2e.manager@qring-e2e.com",
  starterResident: "e2e.starter.resident@qring-e2e.com",
  starterGuard: "e2e.starter.guard@qring-e2e.com",
  otherGuard: "e2e.other.guard@qring-e2e.com",
  basicResident: "e2e.basic.resident@qring-e2e.com",
  basicGuard: "e2e.basic.guard@qring-e2e.com",
  plusResident: "e2e.plus.resident@qring-e2e.com",
  plusGuard: "e2e.plus.guard@qring-e2e.com",
};

async function login(request, email) {
  const response = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).data;
}

async function api(request, session, method, path, data) {
  const response = await request[method](`${apiBase}${path}`, {
    data,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText };
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

async function homeAndDoor(request, session) {
  const { response, body } = await api(request, session, "get", "/security/door-options");
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  expect(body.data.length).toBeGreaterThan(0);
  return body.data[0];
}

test("starter visitor pass, gate validation, history, and cross-estate isolation use the real backend", async ({ page, request }) => {
  const resident = await login(request, emails.starterResident);
  await installBrowserSession(page, resident);
  await page.goto("/dashboard/homeowner/access-passes");
  await expect(page.locator("body")).toContainText(/Access|Pass|Visitor/i);

  const passResult = await api(request, resident, "post", "/homeowner/access-passes", {
    label: "E2E Guest",
    passType: "pin",
    visitorName: "E2E Visitor",
    validForHours: 24,
    maxUses: 2,
  });
  expect(passResult.response.ok(), JSON.stringify(passResult.body)).toBeTruthy();
  const pass = passResult.body.data;
  expect(pass.codeValue).toMatch(/^\d{6}$/);

  const guard = await login(request, emails.starterGuard);
  await installBrowserSession(page, guard);
  await page.goto("/dashboard/security");
  await expect(page.locator("body")).toContainText(/Gate|Security|Console/i);

  const resolved = await api(request, guard, "post", "/security/access-passes/validate", { codeValue: pass.codeValue });
  expect(resolved.response.ok(), JSON.stringify(resolved.body)).toBeTruthy();
  expect(resolved.body.data.visitorName).toBe("E2E Visitor");
  expect(resolved.body.data.homeName).toContain("Starter");

  const manualDoor = await homeAndDoor(request, guard);
  const registered = await api(request, guard, "post", "/security/requests/register", {
    name: "E2E Manual Visitor",
    purpose: "Launch smoke",
    visitorType: "guest",
    phoneNumber: "08031111111",
    doorId: manualDoor.id,
    snapshotBase64: Buffer.from("fake-image").toString("base64"),
    snapshotMime: "image/jpeg",
  });
  expect(registered.response.ok(), JSON.stringify(registered.body)).toBeTruthy();
  expect(registered.body.data.homeownerName || registered.body.data.residentName || manualDoor.homeownerName).toContain("Starter Resident");

  const sessionId = registered.body.data.id;
  const approval = await api(request, resident, "post", `/security/requests/${sessionId}/action`, { action: "approve" });
  expect(approval.response.ok(), JSON.stringify(approval.body)).toBeTruthy();
  const checkIn = await api(request, guard, "post", `/security/requests/${sessionId}/action`, { action: "confirm_entry" });
  expect(checkIn.response.ok(), JSON.stringify(checkIn.body)).toBeTruthy();
  expect(checkIn.body.data.gateStatus).toBe("allowed_in");

  const inside = await api(request, guard, "get", "/security/dashboard");
  expect(inside.response.ok(), JSON.stringify(inside.body)).toBeTruthy();
  expect(JSON.stringify(inside.body.data)).toContain(sessionId);

  const checkout = await api(request, guard, "post", `/security/requests/${sessionId}/action`, { action: "checkout" });
  expect(checkout.response.ok(), JSON.stringify(checkout.body)).toBeTruthy();

  const afterCheckout = await api(request, guard, "get", "/security/dashboard");
  expect(afterCheckout.response.ok(), JSON.stringify(afterCheckout.body)).toBeTruthy();
  expect(JSON.stringify(afterCheckout.body.data.queues?.inside || [])).not.toContain(sessionId);

  const otherGuard = await login(request, emails.otherGuard);
  const crossEstate = await api(request, otherGuard, "post", "/security/access-passes/validate", { codeValue: pass.codeValue });
  expect(crossEstate.response.status()).toBe(403);
  expect(JSON.stringify(crossEstate.body)).not.toContain("E2E Visitor");
});

test("basic vehicle and blocklist flows use the real backend", async ({ page, request }) => {
  const resident = await login(request, emails.basicResident);
  await installBrowserSession(page, resident);
  await page.goto("/dashboard/homeowner/access-passes");
  const vehicle = await api(request, resident, "post", "/estate-ops/vehicles", {
    plateNumber: "E2E-NEW",
    vehicleType: "car",
    makeModel: "Launch Car",
    color: "Green",
  });
  expect(vehicle.response.ok(), JSON.stringify(vehicle.body)).toBeTruthy();

  const guard = await login(request, emails.basicGuard);
  const found = await api(request, guard, "get", "/estate-ops/vehicles?q=E2E-NEW");
  expect(found.response.ok(), JSON.stringify(found.body)).toBeTruthy();
  expect(found.body.data[0].residentName).toBe("Basic Resident");
  expect(found.body.data[0].homeName).toContain("Basic");

  const entry = await api(request, guard, "post", `/estate-ops/vehicles/${vehicle.body.data.id}/gate`, { action: "entry" });
  const exit = await api(request, guard, "post", `/estate-ops/vehicles/${vehicle.body.data.id}/gate`, { action: "exit" });
  expect(entry.response.ok(), JSON.stringify(entry.body)).toBeTruthy();
  expect(exit.response.ok(), JSON.stringify(exit.body)).toBeTruthy();

  const manager = await login(request, emails.manager);
  await installBrowserSession(page, manager);
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/Qring|Checking|Dashboard|Update/i);

  const blocked = await api(request, guard, "post", "/estate-ops/blocklist", {
    visitorName: "Blocked E2E",
    visitorPhone: "08039990000",
    reason: "Launch test",
  });
  expect(blocked.response.ok(), JSON.stringify(blocked.body)).toBeTruthy();
  const listed = await api(request, guard, "get", "/estate-ops/blocklist?q=Blocked");
  expect(JSON.stringify(listed.body.data)).toContain("Launch test");

  const door = await homeAndDoor(request, guard);
  const rejected = await api(request, guard, "post", "/security/requests/register", {
    name: "Blocked E2E",
    purpose: "Should reject",
    visitorType: "guest",
    phoneNumber: "08039990000",
    doorId: door.id,
    snapshotBase64: Buffer.from("fake-image").toString("base64"),
    snapshotMime: "image/jpeg",
  });
  expect(rejected.response.status()).toBe(403);
  expect(JSON.stringify(rejected.body)).toMatch(/blocked/i);

  const deactivated = await api(request, guard, "post", `/estate-ops/blocklist/${blocked.body.data.id}/deactivate`);
  expect(deactivated.response.ok(), JSON.stringify(deactivated.body)).toBeTruthy();
  const allowed = await api(request, guard, "post", "/security/requests/register", {
    name: "Blocked E2E",
    purpose: "Allowed after unblock",
    visitorType: "guest",
    phoneNumber: "08039990000",
    doorId: door.id,
    snapshotBase64: Buffer.from("fake-image").toString("base64"),
    snapshotMime: "image/jpeg",
  });
  expect(allowed.response.ok(), JSON.stringify(allowed.body)).toBeTruthy();
});

test("plus packages, attendance, incidents, manager profile, and notification states use real backend", async ({ page, request }) => {
  const plusGuard = await login(request, emails.plusGuard);
  const door = await homeAndDoor(request, plusGuard);
  const packageArrival = await api(request, plusGuard, "post", "/estate-ops/packages", {
    homeId: door.homeId,
    courier: "E2E Courier",
    description: "Launch package",
  });
  expect(packageArrival.response.ok(), JSON.stringify(packageArrival.body)).toBeTruthy();

  const resident = await login(request, emails.plusResident);
  await installBrowserSession(page, resident);
  await page.goto("/dashboard/homeowner/access-passes");
  const packages = await api(request, resident, "get", "/estate-ops/packages?status=arrived");
  expect(JSON.stringify(packages.body.data)).toContain("Launch package");
  const collected = await api(request, resident, "post", `/estate-ops/packages/${packageArrival.body.data.id}/status`, { status: "collected" });
  expect(collected.response.ok(), JSON.stringify(collected.body)).toBeTruthy();
  expect(collected.body.data.status).toBe("collected");
  const notifications = await api(request, resident, "get", "/notifications");
  expect(JSON.stringify(notifications.body.data)).toContain("package.arrived");

  await installBrowserSession(page, plusGuard);
  await page.goto("/dashboard/security");
  const clockIn = await api(request, plusGuard, "post", "/estate-ops/guard-attendance", { action: "in" });
  expect(clockIn.response.ok(), JSON.stringify(clockIn.body)).toBeTruthy();
  const secondClockIn = await api(request, plusGuard, "post", "/estate-ops/guard-attendance", { action: "in" });
  expect(secondClockIn.response.status()).toBe(400);
  const attendance = await api(request, plusGuard, "get", "/estate-ops/guard-attendance");
  expect(JSON.stringify(attendance.body.data)).toContain("on_duty");
  const clockOut = await api(request, plusGuard, "post", "/estate-ops/guard-attendance", { action: "out" });
  expect(clockOut.response.ok(), JSON.stringify(clockOut.body)).toBeTruthy();
  const invalidClockOut = await api(request, plusGuard, "post", "/estate-ops/guard-attendance", { action: "out" });
  expect(invalidClockOut.response.status()).toBe(400);

  const upload = await request.post(`${apiBase}/estate-ops/incidents/photo`, {
    headers: { Authorization: `Bearer ${plusGuard.accessToken}` },
    multipart: { media: { name: "incident.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") } },
  });
  expect(upload.ok(), await upload.text()).toBeTruthy();
  const photoUrl = (await upload.json()).data.photoUrl;
  expect(photoUrl).toBeTruthy();
  const incident = await api(request, plusGuard, "post", "/estate-ops/incidents", {
    incidentType: "security",
    description: "Launch incident detail check",
    severity: "medium",
    photoUrl,
  });
  expect(incident.response.ok(), JSON.stringify(incident.body)).toBeTruthy();

  const manager = await login(request, emails.manager);
  await installBrowserSession(page, manager);
  await page.goto("/dashboard/estate/settings");
  await expect(page.locator("body")).toContainText(/Settings|Profile/i);
  const profile = await api(request, manager, "put", "/auth/me", { fullName: "E2E Manager Persisted", phone: "08035550000" });
  expect(profile.response.ok(), JSON.stringify(profile.body)).toBeTruthy();
  await page.reload();
  const reloaded = await api(request, manager, "get", "/auth/me");
  expect(reloaded.body.data.fullName).toBe("E2E Manager Persisted");
  expect(reloaded.body.data.phone).toBe("08035550000");
  const relogged = await login(request, emails.manager);
  expect(relogged.user.fullName).toBe("E2E Manager Persisted");

  const detail = await api(request, manager, "get", `/estate-ops/incidents/${incident.body.data.id}`);
  expect(detail.response.ok(), JSON.stringify(detail.body)).toBeTruthy();
  expect(detail.body.data.reportedByName).toBe("Plus Guard");
  expect(detail.body.data.description).toBe("Launch incident detail check");
  expect(detail.body.data.photoUrl).toBe(photoUrl);

  const pushRegistration = await api(request, manager, "post", "/notifications/push-subscriptions", {
    provider: "fcm",
    token: "e2e-token",
    endpoint: "e2e-browser",
    keys: { auth: "e2e-auth", p256dh: "e2e-p256dh" },
  });
  expect(pushRegistration.response.ok(), JSON.stringify(pushRegistration.body)).toBeTruthy();
  const pushStatus = await api(request, manager, "get", "/notifications/push-subscriptions/status");
  expect(pushStatus.body.data.enabled).toBe(true);
  const pushDisable = await api(request, manager, "post", "/notifications/push-subscriptions/disable", {
    provider: "fcm",
    endpoint: "e2e-browser",
    token: "e2e-token",
  });
  expect(pushDisable.response.ok(), JSON.stringify(pushDisable.body)).toBeTruthy();
});
