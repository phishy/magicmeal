import { test, expect } from '@playwright/test';

test.describe('Health Check Tests', () => {
  test('should respond with 200 from base URL', async ({ page }) => {
    const response = await page.goto('/');
    
    // Verify the base URL responds successfully
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);
  });

  test('should attempt to fetch health endpoint', async ({ page, request }) => {
    // Try to fetch /api/health if it exists, otherwise fall back to /
    let response = await request.get('/api/health');
    
    if (response.status() === 404) {
      // Health endpoint may not exist - fall back to base URL check
      response = await request.get('/');
    }
    
    // Ensure we get a successful response from some endpoint
    expect(response.ok()).toBeTruthy();
  });
});
