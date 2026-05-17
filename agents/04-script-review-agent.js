const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prpPath = path.join(__dirname, '..', 'generated', 'prp-output.json');
const testPlanPath = path.join(__dirname, '..', 'generated', 'test-plan.json');
const generatedSpecPath = path.join(__dirname, '..', 'generated', 'saucedemo.generated.spec.js');
const outputPath = path.join(__dirname, '..', 'generated', 'script-review.json');

if (!process.env.OPENAI_API_KEY) {
  console.error('Erreur : OPENAI_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(prpPath)) {
  console.error('Erreur : fichier generated/prp-output.json introuvable.');
  process.exit(1);
}

if (!fs.existsSync(testPlanPath)) {
  console.error('Erreur : fichier generated/test-plan.json introuvable.');
  process.exit(1);
}

if (!fs.existsSync(generatedSpecPath)) {
  console.error('Erreur : fichier generated/saucedemo.generated.spec.js introuvable.');
  console.error('Lance d’abord : node agents/03-playwright-generator-agent.js');
  process.exit(1);
}

const prp = JSON.parse(fs.readFileSync(prpPath, 'utf-8'));
const testPlan = JSON.parse(fs.readFileSync(testPlanPath, 'utf-8'));
const generatedSpec = fs.readFileSync(generatedSpecPath, 'utf-8');

/**
 * Contrôles statiques locaux avant la revue IA.
 * Objectif :
 * - bloquer les patterns dangereux ;
 * - autoriser uniquement l'URL SauceDemo ;
 * - vérifier les bases d’un test Playwright.
 */
function basicStaticChecks(code) {
  const forbiddenPatterns = [
    'child_process',
    'exec(',
    'spawn(',
    'eval(',
    'Function(',
    'fs.',
    'require("fs")',
    "require('fs')",
    'process.env',
  ];

  const issues = [];

  for (const pattern of forbiddenPatterns) {
    if (code.includes(pattern)) {
      issues.push(`Pattern interdit détecté : ${pattern}`);
    }
  }

  const allowedUrls = ['https://www.saucedemo.com/'];
  const urlMatches = code.match(/https?:\/\/[^\s'")]+/g) || [];

  for (const url of urlMatches) {
    if (!allowedUrls.some((allowedUrl) => url.startsWith(allowedUrl))) {
      issues.push(`URL non autorisée détectée : ${url}`);
    }
  }

  if (!code.includes("require('@playwright/test')")) {
    issues.push("Import Playwright manquant : require('@playwright/test')");
  }

  if (!code.includes('test(')) {
    issues.push('Aucun test Playwright détecté.');
  }

  if (!code.includes('expect(')) {
    issues.push('Aucune assertion expect() détectée.');
  }

  if (!code.includes('data-test')) {
    issues.push('Aucun selector data-test détecté.');
  }

  return issues;
}

async function runScriptReviewAgent() {
  const staticIssues = basicStaticChecks(generatedSpec);

  const prompt = `
Tu es un Script Review Agent spécialisé en QA Automation, Playwright, sécurité de scripts et validation de tests générés par IA.

Ton rôle est de revoir un script Playwright généré avant exécution.

Tu dois produire uniquement un JSON valide avec cette structure exacte :

{
  "reviewStatus": "APPROVED | NEEDS_HUMAN_REVIEW | REJECTED",
  "riskLevel": "LOW | MEDIUM | HIGH",
  "summary": "",
  "detectedIssues": [],
  "positivePoints": [],
  "securityChecks": {
    "dangerousCodeDetected": false,
    "details": []
  },
  "qaChecks": {
    "hasPlaywrightImport": true,
    "hasTests": true,
    "hasAssertions": true,
    "usesDataTestSelectors": true,
    "coversNominalFlow": true,
    "containsIntentionalFailureTest": true
  },
  "alignmentWithPrp": {
    "isAligned": true,
    "details": ""
  },
  "recommendation": "",
  "humanApprovalRequired": true
}

Règles :
- Réponds uniquement avec du JSON valide.
- Ne mets pas de markdown.
- Ne mets pas de commentaires.
- Si le script contient du code dangereux, reviewStatus doit être REJECTED.
- Si le script est globalement correct mais doit être relu par un humain, reviewStatus doit être NEEDS_HUMAN_REVIEW.
- Pour ce prototype, humanApprovalRequired doit toujours être true.
- La recommandation doit être claire et actionnable.
- Ne rejette pas un script uniquement parce qu’il contient l’URL autorisée https://www.saucedemo.com/.
- Le test volontairement en échec est accepté dans ce prototype s’il est clairement commenté ou identifiable.

Issues statiques déjà détectées par le contrôleur local :
${JSON.stringify(staticIssues, null, 2)}

PRP :
${JSON.stringify(prp, null, 2)}

Plan de test :
${JSON.stringify(testPlan, null, 2)}

Script Playwright généré :
${generatedSpec}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un agent de revue de scripts Playwright générés par IA. Tu dois protéger le pipeline contre les scripts dangereux, fragiles ou mal alignés avec le besoin.',
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

  const dangerousIssues = staticIssues.filter((issue) =>
    issue.toLowerCase().includes('pattern interdit')
  );

  const blockingIssues = staticIssues.filter((issue) =>
    issue.toLowerCase().includes('url non autorisée')
  );

  if (staticIssues.length > 0) {
    parsed.detectedIssues = [
      ...(parsed.detectedIssues || []),
      ...staticIssues,
    ];

    parsed.securityChecks = parsed.securityChecks || {
      dangerousCodeDetected: false,
      details: [],
    };

    parsed.securityChecks.details = [
      ...(parsed.securityChecks.details || []),
      ...staticIssues,
    ];
  }

  if (dangerousIssues.length > 0 || blockingIssues.length > 0) {
    parsed.reviewStatus = 'REJECTED';
    parsed.riskLevel = 'HIGH';
    parsed.securityChecks.dangerousCodeDetected = dangerousIssues.length > 0;
    parsed.recommendation =
      'Script rejeté : des patterns interdits ou une URL non autorisée ont été détectés. Corriger le script avant toute exécution.';
  } else if (parsed.reviewStatus === 'APPROVED') {
    parsed.reviewStatus = 'NEEDS_HUMAN_REVIEW';
    parsed.humanApprovalRequired = true;
    parsed.recommendation =
      parsed.recommendation ||
      'Le script semble correct, mais une validation humaine reste obligatoire avant exécution.';
  }

  parsed.humanApprovalRequired = true;

  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');

  console.log('==============================');
  console.log('04_AGENT_SCRIPT_REVIEW terminé ✅');
  console.log('==============================');
  console.log(`Fichier généré : ${outputPath}`);
  console.log(`Statut : ${parsed.reviewStatus}`);
  console.log(`Risque : ${parsed.riskLevel}`);
  console.log(`Validation humaine requise : ${parsed.humanApprovalRequired}`);
  console.log(`Recommandation : ${parsed.recommendation}`);
}

runScriptReviewAgent().catch((error) => {
  console.error('Erreur pendant 04_AGENT_SCRIPT_REVIEW :');
  console.error(error.message);
  process.exit(1);
});