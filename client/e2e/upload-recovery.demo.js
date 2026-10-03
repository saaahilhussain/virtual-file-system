import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

// Record the actual Drive UI against deterministic local transport fixtures.
// Production S3 behavior is covered separately by the backend/SDK tests.
test("upload failure and recovery without sending the file twice", async ({ page }) => {
  let initiations = 0;
  let transfers = 0;
  let completions = 0;
  let completed = false;
  await page.route("**/demo-api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user")) return route.fulfill({ json: { name: "Demo Reviewer", email: "reviewer@example.test", role: "user", usedStorage: completed ? 80 : 0, maxStorage: 100 } });
    if (path.includes("/directory/")) return route.fulfill({ json: { items: completed ? [{ id: "demo-file", name: "recovery-demo.txt", size: 80, isDirectory: false }] : [], nextCursor: null } });
    if (path.endsWith("/initiate")) {
      initiations++;
      return route.fulfill({ status: 201, json: { fileId: "demo-file", uploadUrl: "http://127.0.0.1:4175/demo-api/s3-object" } });
    }
    if (path.endsWith("/s3-object")) {
      transfers++;
      expect(route.request().method()).toBe("PUT");
      return route.fulfill({ status: 200, body: "" });
    }
    if (path.endsWith("/complete")) {
      completions++;
      expect(route.request().postDataJSON()).toEqual({ fileId: "demo-file" });
      if (completions === 1) return route.fulfill({ status: 503, json: { error: "S3 verification unavailable; retry completion" } });
      completed = true;
      return route.fulfill({ json: { message: "Upload Complete" } });
    }
    throw new Error(`Unexpected demo request: ${path}`);
  });
  await page.goto("/app");
  await expect(page.getByText(/This folder is empty/)).toBeVisible();
  // Brief pauses are intentional pacing for the published screen recording.
  await page.waitForTimeout(1500);
  await page.getByLabel("Choose file to upload").setInputFiles({
    name: "recovery-demo.txt", mimeType: "text/plain", buffer: Buffer.alloc(80, "x"),
  });
  await expect(page.getByRole("alert")).toHaveText("S3 verification unavailable; retry completion");
  await expect(page.getByRole("button", { name: "Retry completion" })).toBeVisible();
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Retry completion" }).click();
  await expect(page.getByRole("region", { name: "Upload status" })).toHaveCount(0);
  await expect(page.getByText("recovery-demo.txt", { exact: true })).toBeVisible();
  expect({ initiations, transfers, completions }).toEqual({ initiations: 1, transfers: 1, completions: 2 });
  await page.waitForTimeout(2500);
});
