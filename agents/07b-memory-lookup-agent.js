require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Airtable = require('airtable');

const ROOT_DIR = process.cwd();

const QA_SUMMARY_PATH = path.join(ROOT_DIR, 'test-results', 'qa-summary.json');
const REPAIR_PATH = path.join(ROOT_DIR, 'generated', 'repair-suggestion.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'generated', 'memory-context.json');

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_NAME,
} = process.env;

function readJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s:-]/g, '')
    .trim();
}

function buildErrorSignature(qaSummary, repairSuggestion) {
  const failedTest = qaSummary.failedTests?.[0] || {};

  const failureType =
    repairSuggestion.failureType ||
    repairSuggestion.failure_type ||
    qaSummary.failureType ||
    'UNKNOWN';

  const testName =
    failedTest.testName ||
    failedTest.name ||
    qaSummary.testName ||
    'UNKNOWN_TEST';

  const errorMessage =
    failedTest.error ||
    failedTest.errorMessage ||
    qaSummary.errorMessage ||
    '';

  const compactError = normalizeText(errorMessage).slice(0, 180);

  return `${failureType}|${testName}|${compactError}`;
}

async function main() {
  console.log('==============================');
  console.log('07B_AGENT_MEMORY_LOOKUP');
  console.log('==============================');

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    throw new Error('Variables Airtable manquantes dans .env');
  }

  const qaSummary = readJson(QA_SUMMARY_PATH);
  const repairSuggestion = readJson(REPAIR_PATH);

  const errorSignature = buildErrorSignature(qaSummary, repairSuggestion);

  const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE_ID);
  const table = base(AIRTABLE_TABLE_NAME);

  console.log('Recherche mémoire Airtable...');
  console.log(`Signature : ${errorSignature}`);

  const records = await table
    .select({
      maxRecords: 10,
      sort: [{ field: 'Execution Date', direction: 'desc' }],
    })
    .firstPage();

  let bestMatch = null;

  for (const record of records) {
    const fields = record.fields;
    const previousSignature = fields['Error Signature'];

    if (!previousSignature) continue;

    const current = normalizeText(errorSignature);
    const previous = normalizeText(previousSignature);

    const isSimilar =
      current.includes(previous.slice(0, 80)) ||
      previous.includes(current.slice(0, 80)) ||
      current.split('|')[0] === previous.split('|')[0];

    if (isSimilar) {
      bestMatch = {
        recordId: record.id,
        errorSignature: previousSignature,
        previousFix: fields['Suggested Fix'] || fields['Previous Fix'] || '',
        previousRootCause: fields['Root Cause'] || '',
        occurrences: fields['Occurrences'] || 1,
        decision: fields['Decision'] || '',
        riskLevel: fields['Risk Level'] || '',
      };
      break;
    }
  }

  const memoryContext = {
    errorSignature,
    similarIncidentFound: Boolean(bestMatch),
    memoryConfidence: bestMatch ? 'HIGH' : 'NONE',
    previousRecordId: bestMatch?.recordId || '',
    previousFix: bestMatch?.previousFix || '',
    previousRootCause: bestMatch?.previousRootCause || '',
    previousOccurrences: bestMatch?.occurrences || 0,
    memoryNote: bestMatch
      ? `Erreur similaire retrouvée dans Airtable. Correction précédente : ${bestMatch.previousFix || 'non renseignée'}`
      : 'Aucune erreur similaire retrouvée dans Airtable.',
    matchedIncident: bestMatch,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(memoryContext, null, 2), 'utf-8');

  console.log('Mémoire générée ✅');
  console.log(`Fichier généré : ${OUTPUT_PATH}`);
  console.log(`Similar incident found : ${memoryContext.similarIncidentFound}`);
  console.log(`Memory confidence : ${memoryContext.memoryConfidence}`);
}

main().catch((error) => {
  console.error('Erreur pendant 07B_AGENT_MEMORY_LOOKUP :');
  console.error(error.message);
  process.exit(1);
});