// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run preview -- --port=4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

