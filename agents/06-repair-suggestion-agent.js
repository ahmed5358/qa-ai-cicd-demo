const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qaSummaryPath = path.join(__dirname, '..', 'test-results', 'qa-summary.json');
const generatedSpecPath = path.join(__dirname, '..', 'tests', 'saucedemo.generated.spec.js');
const repairOutputPath = path.join(__dirname, '..', 'generated', 'repair-suggestion.json');
const repairedSpecOutputPath = path.join(__dirname, '..', 'generated', 'saucedemo.repaired.spec.js');

if (!process.env.OPENAI_API_KEY) {
  console.error('Erreur : OPENAI_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(qaSummaryPath)) {
  console.error('Erreur : fichier test-results/qa-summary.json introuvable.');
  console.error('Lance d’abord : node analyze-results.js');
  process.exit(1);
}

if (!fs.existsSync(generatedSpecPath)) {
  console.error('Erreur : fichier tests/saucedemo.generated.spec.js introuvable.');
  console.error('Lance d’abord : node agents/05-human-approval.js');
  process.exit(1);
}

const qaSummary = JSON.parse(fs.readFileSync(qaSummaryPath, 'utf-8'));
const generatedSpec = fs.readFileSync(generatedSpecPath, 'utf-8');

async function runRepairSuggestionAgent() {
  const prompt = `
Tu es un Repair Suggestion Agent spécialisé en Playwright, QA Automation et analyse d'erreurs de tests générés par IA.

Ton rôle :
- Lire le résumé QA.
- Lire le script Playwright en échec.
- Identifier la cause probable de l'échec.
- Proposer une correction.
- Générer une version corrigée du script Playwright.

Tu dois répondre uniquement avec un JSON valide selon cette structure exacte :

{
  "repairStatus": "REPAIR_SUGGESTED | NO_REPAIR_NEEDED | NEEDS_HUMAN_INVESTIGATION",
  "failureType": "LOCATOR_BROKEN | TEST_EXPECTATION_MISMATCH | TIMEOUT | ENVIRONMENT_ISSUE | TEST_DATA_ISSUE | PRODUCT_BUG | UNKNOWN",
  "rootCause": "",
  "explanation": "",
  "suggestedFixes": [],
  "riskLevel": "LOW | MEDIUM | HIGH",
  "humanReviewRequired": true,
  "repairedCode": ""
}

Règles :
- Réponds uniquement avec du JSON valide.
- Ne mets pas de markdown.
- Ne mets pas de commentaires hors JSON.
- Le repairedCode doit contenir le fichier Playwright complet corrigé.
- Utilise CommonJS : const { test, expect } = require('@playwright/test');
- N'utilise jamais fs, path, child_process, eval, process.env ou code système.
- Le script corrigé doit rester simple et lisible.
- Utilise uniquement https://www.saucedemo.com/.
- Utilise les selectors data-test corrects de SauceDemo.
- Si tu vois un selector probablement incorrect pour le panier, remplace-le par [data-test="shopping-cart-link"].
- La correction doit rester soumise à validation humaine.

Résumé QA :
${JSON.stringify(qaSummary, null, 2)}

Script Playwright actuel :
${generatedSpec}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un agent de réparation de tests Playwright. Tu proposes des corrections sûres, lisibles et toujours soumises à validation humaine.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('Erreur : la réponse IA n’est pas un JSON valide.');
    console.error(content);
    process.exit(1);
  }

  parsed.humanReviewRequired = true;

  fs.writeFileSync(repairOutputPath, JSON.stringify(parsed, null, 2), 'utf-8');

  if (parsed.repairedCode) {
    const cleanedCode = parsed.repairedCode
      .replace(/^```javascript\s*/i, '')
      .replace(/^```js\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    fs.writeFileSync(repairedSpecOutputPath, cleanedCode, 'utf-8');
  }

  console.log('==============================');
  console.log('06_AGENT_REPAIR_SUGGESTION terminé ✅');
  console.log('==============================');
  console.log(`Fichier généré : ${repairOutputPath}`);
  console.log(`Script réparé proposé : ${repairedSpecOutputPath}`);
  console.log(`Statut réparation : ${parsed.repairStatus}`);
  console.log(`Type d'échec : ${parsed.failureType}`);
  console.log(`Risque : ${parsed.riskLevel}`);
  console.log(`Validation humaine requise : ${parsed.humanReviewRequired}`);
  console.log('');
  console.log('Cause probable :');
  console.log(parsed.rootCause);
  console.log('');
  console.log('Explication :');
  console.log(parsed.explanation);
  console.log('');
  console.log('Corrections proposées :');
  (parsed.suggestedFixes || []).forEach((fix, index) => {
    console.log(`${index + 1}. ${fix}`);
  });
}

runRepairSuggestionAgent().catch((error) => {
  console.error('Erreur pendant 06_AGENT_REPAIR_SUGGESTION :');
  console.error(error.message);
  process.exit(1);
});