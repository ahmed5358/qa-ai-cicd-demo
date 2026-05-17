const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const inputPath = path.join(__dirname, '..', 'generated', 'prp-output.json');
const outputPath = path.join(__dirname, '..', 'generated', 'test-plan.json');

if (!process.env.OPENAI_API_KEY) {
  console.error('Erreur : OPENAI_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error('Erreur : fichier generated/prp-output.json introuvable.');
  console.error('Lance d’abord : node agents/01-prp-agent.js');
  process.exit(1);
}

const prpOutput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

async function runTestDesignAgent() {
  const prompt = `
Tu es un Test Design Agent spécialisé en QA Automation, Playwright et tests end-to-end.

Ton rôle est de transformer un PRP en plan de test structuré.

À partir du PRP fourni, génère uniquement un JSON valide avec cette structure exacte :

{
  "projectName": "",
  "feature": "",
  "strategy": "",
  "scope": {
    "inScope": [],
    "outOfScope": []
  },
  "testCases": [
    {
      "id": "TC-001",
      "title": "",
      "objective": "",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "type": "E2E",
      "preconditions": [],
      "steps": [],
      "expectedResults": [],
      "testData": {},
      "businessRiskCovered": ""
    }
  ],
  "executionOrder": [],
  "validationRules": [],
  "notesForPlaywrightGeneration": []
}

Règles :
- Réponds uniquement avec du JSON valide.
- Ne mets pas de markdown.
- Ne mets pas de commentaires.
- Crée au minimum 2 test cases :
  1. Un test nominal complet login → panier → checkout.
  2. Un test volontairement en échec pour démontrer l'analyse IA.
- Le test volontairement en échec doit être clairement marqué dans le titre et dans les notes.
- Les steps doivent être assez précis pour générer ensuite un script Playwright.
- Les expectedResults doivent être testables avec des assertions.
- Les notesForPlaywrightGeneration doivent mentionner les selectors data-test de SauceDemo si pertinent.

PRP :
${JSON.stringify(prpOutput, null, 2)}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un agent de conception de tests. Tu transformes une spécification PRP en plan de test structuré, testable et prêt pour génération Playwright.',
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

  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');

  console.log('==============================');
  console.log('02_AGENT_TEST_DESIGN terminé ✅');
  console.log('==============================');
  console.log(`Fichier généré : ${outputPath}`);
  console.log(`Feature : ${parsed.feature}`);
  console.log(`Nombre de test cases : ${parsed.testCases?.length || 0}`);
  console.log('Ordre d’exécution :');
  console.log(parsed.executionOrder);
}

runTestDesignAgent().catch((error) => {
  console.error('Erreur pendant 02_AGENT_TEST_DESIGN :');
  console.error(error.message);
  process.exit(1);
});