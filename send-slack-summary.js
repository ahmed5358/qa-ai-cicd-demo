const fs = require('fs');
const path = require('path');
require('dotenv').config();

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

const aiSummaryPath = path.join(__dirname, 'test-results', 'ai-summary.txt');

if (!slackWebhookUrl) {
  console.error('Erreur : SLACK_WEBHOOK_URL est manquante dans le fichier .env');
  process.exit(1);
}

if (!fs.existsSync(aiSummaryPath)) {
  console.error('Erreur : fichier test-results/ai-summary.txt introuvable.');
  console.error('Lance d’abord : node generate-ai-summary.js');
  process.exit(1);
}

const aiSummary = fs.readFileSync(aiSummaryPath, 'utf-8');

async function sendToSlack() {
  const payload = {
    text: `🚦 *Rapport QA/CI-CD automatisé*\n\n${aiSummary}`,
  };

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Slack ${response.status}: ${errorText}`);
  }

  console.log('==============================');
  console.log('Message envoyé dans Slack ✅');
  console.log('==============================');
}

sendToSlack().catch((error) => {
  console.error('Erreur pendant l’envoi Slack :');
  console.error(error.message);
  process.exit(1);
});