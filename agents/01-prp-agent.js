const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const inputPath = path.join(__dirname, '..', 'inputs', 'prp-request.json');
const outputPath = path.join(__dirname, '..', 'generated', 'prp-output.json');

if (!process.env.OPENAI_API_KEY) {
  console.error('Erreur : OPENAI_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error('Erreur : fichier inputs/prp-request.json introuvable.');
  process.exit(1);
}

const prpRequest = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

async function runPrpAgent() {
  const prompt = `
Tu es un PRP Agent spécialisé en QA Automation, Playwright et CI/CD.

Ton rôle est de transformer un besoin métier en Product Requirement Prompt structuré et testable.

À partir de l'entrée fournie, génère uniquement un JSON valide avec cette structure exacte :

{
  "projectName": "",
  "feature": "",
  "businessGoal": "",
  "applicationUrl": "",
  "targetUser": "",
  "businessRisk": "",
  "criticalUserJourneys": [],
  "acceptanceCriteria": [],
  "testData": {},
  "qualityGoals": [],
  "outOfScope": [],
  "assumptions": [],
  "testPriority": "LOW | MEDIUM | HIGH | CRITICAL"
}

Règles :
- Réponds uniquement avec du JSON valide.
- Ne mets pas de markdown.
- Ne mets pas de commentaires.
- Les critères d'acceptation doivent être clairs, testables et orientés utilisateur.
- Le businessRisk doit expliquer l'impact si le parcours échoue.
- Le testPriority doit être cohérent avec la criticité du parcours.

Entrée :
${JSON.stringify(prpRequest, null, 2)}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un agent PRP. Tu transformes un besoin métier en spécification testable pour une pipeline QA/CI-CD agentique.',
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
  console.log('01_AGENT_PRP terminé ✅');
  console.log('==============================');
  console.log(`Fichier généré : ${outputPath}`);
  console.log(`Feature : ${parsed.feature}`);
  console.log(`Priorité : ${parsed.testPriority}`);
}

runPrpAgent().catch((error) => {
  console.error('Erreur pendant 01_AGENT_PRP :');
  console.error(error.message);
  process.exit(1);
});