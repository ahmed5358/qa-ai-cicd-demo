const { test, expect } = require('@playwright/test');

test.describe('SauceDemo E2E Tests', () => {
  
test('Nominal Test: Successful Login, Add to Cart, and Checkout', async ({ page }) => {
    // Navigate to the application URL
    await page.goto('https://www.saucedemo.com/');
    
    // Enter username and password
    await page.fill('[data-test=username]', 'standard_user');
    await page.fill('[data-test=password]', 'secret_sauce');
    
    // Click the login button
    await page.click('[data-test=login-button]');
    
    // Verify that the user is redirected to the products page
    await expect(page).toHaveURL(/.*inventory\.html/);
    
    // Select a product to add to the cart
    await page.click('[data-test=add-to-cart-sauce-labs-backpack]');
    
    // Click the cart icon
    await page.click('[data-test="shopping-cart-link"]');
    
    // Click the checkout button
    await page.click('[data-test=checkout]');
    
    // Fill in the checkout information
    await page.fill('[data-test=firstName]', 'Ahmed');
    await page.fill('[data-test=lastName]', 'QA');
    await page.fill('[data-test=postalCode]', '69000');
    
    // Click the continue button
    await page.click('[data-test=continue]');
    
    // Click the finish button
    await page.click('[data-test=finish]');
    
    // Verify that the confirmation message is displayed
    const confirmationMessage = await page.locator('.complete-header');
    await expect(confirmationMessage).toHaveText('Thank you for your order!');
  });

  test('Negative Test: Failed Login with Invalid Credentials', async ({ page }) => {
    // Navigate to the application URL
    await page.goto('https://www.saucedemo.com/');
    
    // Enter invalid username and password
    await page.fill('[data-test=username]', 'invalid_user');
    await page.fill('[data-test=password]', 'wrong_password');
    
    // Click the login button
    await page.click('[data-test=login-button]');
    
    // Verify that an error message is displayed
    const errorMessage = await page.locator('[data-test=error]');
    await expect(errorMessage).toBeVisible(); // This test is expected to fail if the error message is not displayed
    // Comment: This test will fail because the credentials are invalid, and we expect an error message to be shown.
  });

});