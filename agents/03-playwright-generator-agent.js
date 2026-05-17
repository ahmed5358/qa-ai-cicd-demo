const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prpPath = path.join(__dirname, '..', 'generated', 'prp-output.json');
const testPlanPath = path.join(__dirname, '..', 'generated', 'test-plan.json');
const outputPath = path.join(__dirname, '..', 'generated', 'saucedemo.generated.spec.js');

if (!process.env.OPENAI_API_KEY) {
  console.error('Erreur : OPENAI_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(prpPath)) {
  console.error('Erreur : fichier generated/prp-output.json introuvable.');
  console.error('Lance d’abord : node agents/01-prp-agent.js');
  process.exit(1);
}

if (!fs.existsSync(testPlanPath)) {
  console.error('Erreur : fichier generated/test-plan.json introuvable.');
  console.error('Lance d’abord : node agents/02-test-design-agent.js');
  process.exit(1);
}

const prp = JSON.parse(fs.readFileSync(prpPath, 'utf-8'));
const testPlan = JSON.parse(fs.readFileSync(testPlanPath, 'utf-8'));

async function runPlaywrightGeneratorAgent() {
  const prompt = `
Tu es un Playwright Test Generator Agent spécialisé en JavaScript, Playwright et QA Automation.

Ton rôle est de générer un fichier de test Playwright JavaScript à partir d'un PRP et d'un plan de test.

Contraintes strictes :
- Génère uniquement du code JavaScript valide.
- Ne mets pas de markdown.
- Ne mets pas de backticks.
- Utilise CommonJS : const { test, expect } = require('@playwright/test');
- Le fichier doit être directement exécutable par Playwright.
- Utilise uniquement le site https://www.saucedemo.com/
- Utilise les selectors data-test de SauceDemo.
- Crée au minimum 2 tests :
  1. Un test nominal complet : login, ajout panier, checkout, confirmation.
  2. Un test volontairement en échec pour démontrer l'analyse IA.
- Le test volontairement en échec doit contenir un commentaire clair expliquant l'échec.
- Les tests doivent être lisibles, maintenables et simples.
- Ne génère aucun code dangereux.
- Ne lis aucun fichier local.
- N'utilise pas eval, child_process, fs, path, request réseau externe ou logique système.
- Le test doit utiliser uniquement Playwright.

Données PRP :
${JSON.stringify(prp, null, 2)}

Plan de test :
${JSON.stringify(testPlan, null, 2)}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un agent de génération de tests Playwright. Tu produis uniquement du code JavaScript Playwright sûr, lisible et prêt à être validé.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
  });

  const generatedCode = response.choices[0].message.content
    .replace(/^```javascript\s*/i, '')
    .replace(/^```js\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  fs.writeFileSync(outputPath, generatedCode, 'utf-8');

  console.log('==============================');
  console.log('03_AGENT_PLAYWRIGHT_GENERATOR terminé ✅');
  console.log('==============================');
  console.log(`Fichier généré : ${outputPath}`);
  console.log('');
  console.log('Important : ce fichier est généré dans /generated.');
  console.log('Il devra être validé par le Script Review Agent avant exécution.');
}

runPlaywrightGeneratorAgent().catch((error) => {
  console.error('Erreur pendant 03_AGENT_PLAYWRIGHT_GENERATOR :');
  console.error(error.message);
  process.exit(1);
});