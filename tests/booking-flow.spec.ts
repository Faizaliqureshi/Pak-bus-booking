import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

function ymdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const SEARCH_CORRIDORS = [
  ["Karachi", "Lahore"],
  ["Karachi", "Sukkur"],
] as const;

/** Find a date (within next few days) that has a live searchable trip. */
async function resolveTravelSearch(
  request: APIRequestContext,
): Promise<{ origin: string; destination: string; date: string }> {
  for (const [origin, destination] of SEARCH_CORRIDORS) {
    for (let offset = 0; offset <= 5; offset++) {
      const day = new Date();
      day.setDate(day.getDate() + offset);
      const date = ymdLocal(day);
      const res = await request.get("/api/trips/search", {
        params: { origin, destination, date },
      });
      if (!res.ok()) continue;
      const json = (await res.json()) as {
        success?: boolean;
        data?: unknown[];
      };
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return { origin, destination, date };
      }
    }
  }
  throw new Error(
    "No live trips found in the next 5 days. Publish a partner route or run `npx prisma db seed`.",
  );
}

async function selectFirstAvailableSeat(page: Page): Promise<string> {
  await expect(page.getByText("Loading seat map...")).toBeHidden({
    timeout: 30_000,
  });
  await expect(page.locator("[data-testid^=seat-]").first()).toBeVisible({
    timeout: 30_000,
  });

  // Prefer a low seat number; seeded demo books seat 12.
  const candidates = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
  ];
  for (const seat of candidates) {
    const btn = page.getByTestId(`seat-${seat}`);
    if ((await btn.count()) === 0) continue;
    if (await btn.isDisabled()) continue;
    await btn.click();
    // After lock, seat stays enabled (selected); continue CTA becomes active.
    await expect(page.getByTestId("continue-booking-btn")).toBeEnabled({
      timeout: 20_000,
    });
    return seat;
  }
  throw new Error("No available seat found on the map.");
}

test.describe("Booking flow", () => {
  test("search → select seat → checkout → e-ticket", async ({
    page,
    request,
  }) => {
    const travel = await resolveTravelSearch(request);

    // 1) Home search widget → results
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /One App for Every Journey/i }),
    ).toBeVisible();

    await page.getByTestId("search-buses-btn").click();
    await page.waitForURL(/\/search\?/);

    // Ensure we search the live corridor/date (widget defaults may differ by day).
    await page.goto(
      `/search?origin=${encodeURIComponent(travel.origin)}&destination=${encodeURIComponent(travel.destination)}&date=${travel.date}`,
    );

    await expect(page.getByTestId("trip-card").first()).toBeVisible({
      timeout: 30_000,
    });

    // 2) Expand seats
    await page.getByTestId("check-seats-btn").first().click();
    await expect(page.getByText("Select Your Seat")).toBeVisible();

    // Book as male so pink female-adjacent rules are less likely to block seat 1.
    await page.getByRole("button", { name: "Male", exact: true }).click();

    // 3) Lock an available seat
    const seat = await selectFirstAvailableSeat(page);
    await expect(page.getByTestId("continue-booking-btn")).toBeEnabled({
      timeout: 20_000,
    });
    await page.getByTestId("continue-booking-btn").click();

    // 4) Checkout
    await page.waitForURL(/\/checkout\//, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /Passenger details/i }),
    ).toBeVisible();
    await expect(page.getByText(new RegExp(`Seat ${seat}`))).toBeVisible();

    await page.getByLabel("Full name").fill("E2E Test Passenger");

    // Gender select (Base UI / shadcn combobox)
    const genderTrigger = page
      .locator("section")
      .filter({ hasText: `Seat ${seat}` })
      .getByRole("combobox")
      .first();
    await genderTrigger.click();
    await page.getByRole("option", { name: "Male", exact: true }).click();

    await page.getByLabel("CNIC").fill("4210112345671");
    await expect(page.getByLabel("CNIC")).toHaveValue("42101-1234567-1");

    await page.getByLabel("Mobile number").fill("03001234567");
    await expect(page.getByLabel("Mobile number")).toHaveValue("0300-1234567");

    await page.getByLabel("Email").fill("e2e.passenger@ticketpass.pk");

    // Prefer JazzCash tab (default) and confirm
    await page.getByTestId("pay-confirm-btn").click();

    // 5) E-ticket
    await page.waitForURL(/\/ticket\//, { timeout: 45_000 });
    await expect(page.getByText("E-Ticket", { exact: true })).toBeVisible();
    await expect(page.getByText("PNR")).toBeVisible();
    await expect(page.getByText("E2E Test Passenger")).toBeVisible();
    await expect(
      page.locator("#e-ticket").getByText(`Seat ${seat}`, { exact: true }),
    ).toBeVisible();
  });
});
