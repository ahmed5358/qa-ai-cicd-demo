const { test, expect } = require('@playwright/test');

test('SauceDemo - login, ajout panier et checkout complet', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');

  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();

  await expect(page.locator('[data-test="title"]')).toHaveText('Products');

  await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
  await page.locator('[data-test="shopping-cart-link"]').click();

  await expect(page.locator('[data-test="inventory-item-name"]')).toHaveText('Sauce Labs Backpack');

  await page.locator('[data-test="checkout"]').click();

  await page.locator('[data-test="firstName"]').fill('Ahmed');
  await page.locator('[data-test="lastName"]').fill('QA');
  await page.locator('[data-test="postalCode"]').fill('69000');

  await page.locator('[data-test="continue"]').click();

  await expect(page.locator('[data-test="title"]')).toHaveText('Checkout: Overview');

  await page.locator('[data-test="finish"]').click();

  await expect(page.locator('[data-test="complete-header"]')).toHaveText('Thank you for your order!');
});

test('SauceDemo - échec volontaire pour analyse IA', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');

  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();

  // Échec volontaire : le vrai titre est "Products", pas "Dashboard"
  await expect(page.locator('[data-test="title"]')).toHaveText('Dashboard');
});