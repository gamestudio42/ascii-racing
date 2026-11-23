import { expect, test } from '@playwright/test';

test('the title screen loads and draws', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle('ASCII Racing');
  await expect(page.locator('#c')).toBeVisible();

  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement) || canvas.width < 2 || canvas.height < 2) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r !== 7 || g !== 8 || b !== 12) painted += 1;
      if (painted > 40) return true;
    }
    return false;
  });

  expect(errors).toEqual([]);
});
