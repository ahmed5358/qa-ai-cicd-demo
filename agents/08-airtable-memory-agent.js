const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Airtable = require('airtable');

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_NAME,
} = process.env;

const qaSummaryPath = path.join(__dirname, '..', 'test-results', 'qa-summary.json');
const aiSummaryPath = path.join(__dirname, '..', 'test-results', 'ai-summary.txt');
const repairSuggestionPath = path.join(__dirname, '..', 'generated', 'repair-suggestion.json');

if (!AIRTABLE_TOKEN) {
  console.error('Erreur : AIRTABLE_TOKEN est manquant dans .env');
  process.exit(1);
}

if (!AIRTABLE_BASE_ID) {
  console.error('Erreur : AIRTABLE_BASE_ID est manquant dans .env');
  process.exit(1);
}

if (!AIRTABLE_TABLE_NAME) {
  console.error('Erreur : AIRTABLE_TABLE_NAME est manquant dans .env');
  process.exit(1);
}

if (!fs.existsSync(qaSummaryPath)) {
  console.error('Erreur : test-results/qa-summary.json introuvable.');
  console.error('Lance d’abord : node analyze-results.js');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE_ID);

const qaSummary = JSON.parse(fs.readFileSync(qaSummaryPath, 'utf-8'));

const aiSummary = fs.existsSync(aiSummaryPath)
  ? fs.readFileSync(aiSummaryPath, 'utf-8')
  : '';

const repairSuggestion = fs.existsSync(repairSuggestionPath)
  ? JSON.parse(fs.readFileSync(repairSuggestionPath, 'utf-8'))
  : null;

const firstFailedTest = qaSummary.failedTests?.[0] || null;

function normalizePriority(riskLevel) {
  if (riskLevel === 'ÉLEVÉ' || riskLevel === 'HIGH') return 'Élevée';
  if (riskLevel === 'CRITICAL') return 'Critique';
  if (riskLevel === 'MEDIUM' || riskLevel === 'MOYEN') return 'Moyenne';
  return 'Faible';
}

function normalizeRiskLevel(riskLevel) {
  if (riskLevel === 'ÉLEVÉ') return 'HIGH';
  if (riskLevel === 'FAIBLE') return 'LOW';
  return riskLevel || 'UNKNOWN';
}

function normalizeStatus(decision) {
  if (decision === 'GO') return 'FIXED';
  if (decision === 'NO GO') return 'OPEN';
  return 'NEEDS_REVIEW';
}

function buildIncidentName() {
  if (firstFailedTest) {
    return `${qaSummary.decision} - ${firstFailedTest.title}`;
  }

  return `${qaSummary.decision} - ${qaSummary.project}`;
}

async function runAirtableMemoryAgent() {
  const fields = {
    Name: buildIncidentName(),
    Project: qaSummary.project || 'QA AI CI/CD Demo - SauceDemo',
    'Execution Date': qaSummary.executionDate
      ? qaSummary.executionDate.split('T')[0]
      : new Date().toISOString().split('T')[0],
    Decision: qaSummary.decision || 'UNKNOWN',
    'Risk Level': normalizeRiskLevel(qaSummary.riskLevel),
    'Failure Type': repairSuggestion?.failureType || 'UNKNOWN',
    'Test Name': firstFailedTest?.title || '',
    'Error Message': firstFailedTest?.error || '',
    'Root Cause': repairSuggestion?.rootCause || '',
    'Suggested Fix': Array.isArray(repairSuggestion?.suggestedFixes)
      ? repairSuggestion.suggestedFixes.join('\n')
      : '',
    Status: normalizeStatus(qaSummary.decision),
    Occurrences: 1,
    'AI Summary': aiSummary,
    'Priorité': normalizePriority(qaSummary.riskLevel),
  };

  console.log('==============================');
  console.log('08_AGENT_MEMORY_AIRTABLE');
  console.log('==============================');
  console.log('Création de l’incident dans Airtable...');

  const createdRecords = await base(AIRTABLE_TABLE_NAME).create([
    {
      fields,
    },
  ]);

  console.log('Incident créé dans Airtable ✅');
  console.log(`Record ID : ${createdRecords[0].id}`);
  console.log(`Nom : ${fields.Name}`);
}

runAirtableMemoryAgent().catch((error) => {
  console.error('Erreur pendant 08_AGENT_MEMORY_AIRTABLE :');

  if (error.statusCode) {
    console.error(`Status code : ${error.statusCode}`);
  }

  console.error(error.message || error);
  process.exit(1);
});