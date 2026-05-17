const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const qaSummaryPath = path.join(__dirname, 'test-results', 'qa-summary.json');
const outputPath = path.join(__dirname, 'test-results', 'ai-summary.txt');

if (!process.env.OPENAI_API_KEY) {
  console.error('Erreur : OPENAI_API_KEY est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(qaSummaryPath)) {
  console.error('Erreur : fichier test-results/qa-summary.json introuvable.');
  console.error('Lance d’abord : node analyze-results.js');
  process.exit(1);
}

const qaSummary = JSON.parse(fs.readFileSync(qaSummaryPath, 'utf-8'));

async function generateSummary() {
  const prompt = `
Tu es un expert QA Automation, CI/CD et livraison logicielle.

Analyse ce résumé de tests automatisés Playwright et produis une synthèse claire pour une équipe produit/technique.

Contraintes :
- Réponds en français.
- Sois concis mais professionnel.
- Donne une décision GO ou NO GO.
- Explique le risque.
- Explique l'erreur principale.
- Donne une recommandation actionnable.
- Le format doit être adapté à un message Slack.

Résumé QA :
${JSON.stringify(qaSummary, null, 2)}
`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Tu es un assistant QA/CI/CD qui transforme des résultats de tests automatisés en synthèse claire et exploitable.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
  });

  const aiSummary = response.choices[0].message.content;

  fs.writeFileSync(outputPath, aiSummary, 'utf-8');

  console.log('==============================');
  console.log('Synthèse IA générée');
  console.log('==============================');
  console.log(aiSummary);
  console.log(`\nFichier généré : ${outputPath}`);
}

generateSummary().catch((error) => {
  console.error('Erreur pendant la génération IA :');
  console.error(error.message);
  process.exit(1);
});