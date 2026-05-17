// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour le prototype QA AI CI/CD.
 * Objectif :
 * - Exécuter les tests uniquement sur Chromium
 * - Générer un rapport HTML lisible
 * - Générer un rapport JSON exploitable par l'IA
 * - Capturer screenshot et vidéo en cas d'échec
 */
export default defineConfig({
  testDir: './tests',

  // Exécute les tests en parallèle quand c’est possible
  fullyParallel: true,

  // Empêche de laisser un test.only par erreur en CI
  forbidOnly: !!process.env.CI,

  // Retry uniquement en environnement CI
  retries: process.env.CI ? 2 : 0,

  // En CI, on limite à 1 worker pour plus de stabilité
  workers: process.env.CI ? 1 : undefined,

  // Rapports générés après exécution
  reporter: [
  ['html', { open: 'never' }],
  ['json', { outputFile: 'test-results/results.json' }],
],
  use: {
    // Capture une trace uniquement en cas de retry
    trace: 'on-first-retry',

    // Capture une screenshot uniquement en cas d’échec
    screenshot: 'only-on-failure',

    // Garde une vidéo uniquement en cas d’échec
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});