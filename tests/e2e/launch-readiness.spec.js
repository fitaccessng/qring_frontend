import { expect, test } from "@playwright/test";

const managerUser = { id: "manager-test", fullName: "Kelvin Manager", email: "manager@test.local", role: "estate", phone: "08030000000" };
const residentUser = { id: "green-resident", fullName: "Green Resident", email: "resident@test.local", role: "homeowner" };
const guardUser = { id: "green-guard", fullName: "Green Guard", email: "guard@test.local", role: "security" };

const overview = {
  estates: [
    { id: "green-estate", name: "Green Estate", status: "active" },
    { id: "sunrise-estate", name: "Sunrise Estate", status: "active" },
  ],
  homes: [
    { id: "green-home", name: "Green A1", estateId: "green-estate", homeownerId: "green-resident", homeownerName: "Green Resident", homeownerEmail: "resident@test.local" },
    { id: "sunrise-home", name: "Sunrise B1", estateId: "sunrise-estate", homeownerId: "sunrise-resident", homeownerName: "Sunrise Resident", homeownerEmail: "sunrise@test.local" },
  ],
  homeowners: [
    { id: "green-resident", fullName: "Green Resident", email: "resident@test.local", estateId: "green-estate", roleLabel: "Estate Homeowner" },
    { id: "sunrise-resident", fullName: "Sunrise Resident", email: "sunrise@test.local", estateId: "sunrise-estate", roleLabel: "Estate Homeowner" },
  ],
  securityUsers: [
    { id: "green-guard", fullName: "Green Guard", email: "guard@test.local", estateId: "green-estate", gateId: "Green Main", active: true },
    { id: "sunrise-guard", fullName: "Sunrise Guard", email: "sunrise.guard@test.local", estateId: "sunrise-estate", gateId: "Sunrise Main", active: true },
  ],
  doors: [{ id: "green-door", name: "Green Main Door", estateId: "green-estate", homeId: "green-home", status: "online" }],
  subscription: { plan: "estate_growth", planName: "Growth" },
};

async function installSession(page, user) {
  await page.addInitScript(({ currentUser }) => {
    const token = "header." + btoa(JSON.stringify({ sub: currentUser.id, role: currentUser.role, type: "access", exp: Math.floor(Date.now() / 1000) + 3600 })) + ".sig";
    sessionStorage.setItem("qring_access_token", token);
    sessionStorage.setItem("qring_refresh_token", "refresh-token");
    sessionStorage.setItem("qring_user", JSON.stringify(currentUser));
    localStorage.setItem("qring.activeEstateId", "green-estate");
  }, { currentUser: user });
}

async function stubApi(page) {
  await page.route("**/api/v1/auth/me", async (route) => {
    if (route.request().method() === "PUT") {
      const payload = route.request().postDataJSON();
      return route.fulfill({ json: { data: { ...managerUser, fullName: payload.fullName, phone: payload.phone, managedEstates: overview.estates } } });
    }
    return route.fulfill({ json: { data: { ...managerUser, managedEstates: overview.estates } } });
  });
  await page.route("**/api/v1/estate/overview**", (route) => route.fulfill({ json: { data: overview } }));
  await page.route("**/api/v1/estate/settings-summary", (route) => route.fulfill({ json: { data: overview } }));
  await page.route("**/api/v1/estate/*/alerts**", (route) => {
    const url = route.request().url();
    const rows = url.includes("green-estate")
      ? [{ id: "green-broadcast", title: "Green Broadcast", alertType: "notice" }, { id: "green-poll", title: "Green Poll", alertType: "poll", pollOptions: ["Yes", "No"] }]
      : [{ id: "sunrise-broadcast", title: "Sunrise Broadcast", alertType: "notice" }];
    route.fulfill({ json: { data: rows } });
  });
  await page.route("**/api/v1/estate-ops/**", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/security/**", (route) => route.fulfill({ json: { data: { profile: guardUser, queues: { pending: [], inside: [] }, rules: {} } } }));
  await page.route("**/api/v1/notifications/push-subscriptions/status", (route) => route.fulfill({ json: { data: { enabled: false, activeCount: 0, providers: [] } } }));
  await page.route("**/api/v1/notifications/push-subscriptions", (route) => route.fulfill({ json: { data: { status: "registered", id: "push-1" } } }));
  await page.route("**/api/v1/notifications/**", (route) => route.fulfill({ json: { data: [] } }));
}

test("manager switches estates without stale resident or guard data", async ({ page }) => {
  await installSession(page, managerUser);
  await stubApi(page);
  await page.goto("/dashboard/estate/invites");
  await page.getByRole("button", { name: /Resident List/i }).evaluate((button) => button.click());
  await expect(page.getByText("Green Resident")).toBeVisible();
  await expect(page.getByText("Sunrise Resident")).toBeHidden();
  await page.locator("select").selectOption("sunrise-estate");
  await expect(page.getByText("Sunrise Resident")).toBeVisible();
  await expect(page.getByText("Green Resident")).toBeHidden();
});

test("manager profile and notification settings render truthful states", async ({ page }) => {
  await installSession(page, managerUser);
  await stubApi(page);
  await page.goto("/dashboard/estate/settings");
  await page.getByText("Personal Details").click();
  await page.locator('input[type="text"]').first().fill("Kelvin Launch");
  await page.getByText("Save Changes").click();
  await expect(page.getByRole("heading", { name: "Kelvin Launch" })).toBeVisible();
  await page.getByText("Notification Preferences").click();
  await expect(page.getByText(/Notifications are disabled for this browser|Browser permission is blocked/i)).toBeVisible();
});

test("resident and security dashboards load in desktop and mobile projects", async ({ page }) => {
  await installSession(page, residentUser);
  await stubApi(page);
  await page.goto("/dashboard/homeowner");
  await expect(page.getByText(/Good (Morning|Afternoon|Evening), Green/i)).toBeVisible();
  await expect(page.getByText("Sunrise Estate")).toBeHidden();

  await installSession(page, guardUser);
  await stubApi(page);
  await page.goto("/dashboard/security");
  await expect(page.getByRole("heading", { name: "Qring Security" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Security Operations" })).toBeVisible();

  const operationModals = [
    { button: "Log Visitor", title: "Log New Visitor" },
    { button: "Validate Pass", title: "Validate Access Pass" },
    { button: "Vehicle Access", title: "Vehicle Access Lookup" },
    { button: "Parcel Arrival", title: "Log Package Arrival" },
    { button: "Guard Shift", title: "Guard Shift Attendance" },
    { button: "Report Incident", title: "Report Security Incident" },
  ];

  for (const item of operationModals) {
    await page.getByRole("button", { name: new RegExp(item.button, "i") }).click();
    await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`Close ${item.title}`, "i") }).click();
  }
});
