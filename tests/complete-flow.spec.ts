import { expect, test, type Page } from "@playwright/test";

async function staffLogin(page: Page, role: "Master" | "Partner") {
  await page.goto("/staff/login");
  await page.getByRole("button", { name: new RegExp(`^${role}\\b`) }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(role === "Master" ? /\/master/ : /\/partner/);
}

test.describe("Complete live flows", () => {
  test("partner can reserve a live seat and passengers cannot take it", async ({
    page,
    request,
  }) => {
    await staffLogin(page, "Partner");
    await page.goto("/partner/routes");
    const seatsLink = page.getByRole("link", { name: "Seats & bookings" }).first();
    await expect(seatsLink).toBeVisible({ timeout: 20_000 });
    await seatsLink.click();
    await expect(page.getByRole("heading", { name: "Reserve seats" })).toBeVisible();

    const openSeat = page.locator("[data-testid^=partner-seat-]:not([disabled])").first();
    await expect(openSeat).toBeVisible({ timeout: 20_000 });
    const seatTestId = await openSeat.getAttribute("data-testid");
    expect(seatTestId).toBeTruthy();
    const seatNumber = seatTestId!.replace("partner-seat-", "");
    const tripId = page.url().split("/partner/trips/")[1]?.split(/[?#]/)[0];
    expect(tripId).toBeTruthy();

    await openSeat.click();
    await expect(page.getByText(/Could not update seat|Failed/i)).toHaveCount(0);
    await expect(page.getByTestId(seatTestId!)).toHaveClass(/bg-\[#0a2f6b\]/, {
      timeout: 15_000,
    });

    const demo = await request.get("/api/demo-user");
    const demoJson = (await demo.json()) as { data?: { id: string } };
    const userId = demoJson.data?.id;
    expect(userId).toBeTruthy();

    const blocked = await request.post("/api/seats/lock", {
      data: { tripId, seatNumber, userId },
    });
    const blockedJson = (await blocked.json()) as { message?: string };
    expect(blocked.status()).toBe(409);
    expect(blockedJson.message ?? "").toMatch(/reserved/i);

    await page.getByTestId(seatTestId!).click();
    await expect(page.getByTestId(seatTestId!)).not.toHaveClass(/bg-\[#0a2f6b\]/, {
      timeout: 15_000,
    });

    const free = await request.post("/api/seats/lock", {
      data: { tripId, seatNumber, userId },
    });
    expect(free.ok()).toBeTruthy();
    await request.post("/api/seats/unlock", {
      data: { tripId, seatNumber, userId },
    });
  });

  test("passenger can lock a seat on a live Karachi-Lahore trip", async ({
    page,
    request,
  }) => {
    const corridors = [
      ["Karachi", "Lahore"],
      ["Karachi", "Sukkur"],
    ] as const;
    let travelDate = "";
    let origin = "Karachi";
    let destination = "Lahore";
    for (const [from, to] of corridors) {
      for (let offset = 0; offset <= 5; offset++) {
        const day = new Date();
        day.setDate(day.getDate() + offset);
        const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const res = await request.get("/api/trips/search", {
          params: { origin: from, destination: to, date },
        });
        if (!res.ok()) continue;
        const json = (await res.json()) as { success?: boolean; data?: unknown[] };
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          travelDate = date;
          origin = from;
          destination = to;
          break;
        }
      }
      if (travelDate) break;
    }
    expect(travelDate).toBeTruthy();

    await page.goto(
      `/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${travelDate}`,
    );
    await expect(page.getByTestId("trip-card").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.getByTestId("check-seats-btn").first().click();
    await expect(page.getByText("Select Your Seat")).toBeVisible();
    await page.getByRole("button", { name: "Male", exact: true }).click();

    const seat = page.locator("[data-testid^=seat-]:not([disabled])").first();
    await expect(seat).toBeVisible({ timeout: 30_000 });
    await seat.click();
    await expect(page.getByTestId("continue-booking-btn")).toBeEnabled({
      timeout: 20_000,
    });
  });

  test("master finance shows revenue and outstanding payouts", async ({
    page,
  }) => {
    await staffLogin(page, "Master");
    await page.getByRole("button", { name: "Finance" }).click();
    await expect(page.getByText("Total revenue")).toBeVisible();
    await expect(page.getByText("Total outstanding payouts")).toBeVisible();
    await expect(page.getByText("Total partner profit")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Partner-wise revenue & outstanding payouts",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Fleet-wise revenue & outstanding payouts",
      }),
    ).toBeVisible();
  });
});
