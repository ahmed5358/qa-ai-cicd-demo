const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'test-results', 'results.json');
const outputPath = path.join(__dirname, 'test-results', 'qa-summary.json');

function cleanAnsi(text = '') {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function extractSpecs(suites, collected = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      const testResult = spec.tests?.[0]?.results?.[0];

      if (!testResult) continue;

      const status = testResult.status;
      const errorMessage = cleanAnsi(
        testResult.error?.message ||
        testResult.errors?.[0]?.message ||
        ''
      );

      collected.push({
        title: spec.title,
        file: spec.file,
        line: spec.line,
        status,
        durationMs: testResult.duration,
        error: errorMessage,
        attachments: (testResult.attachments || []).map((attachment) => ({
          name: attachment.name,
          type: attachment.contentType,
          path: attachment.path,
        })),
      });
    }

    if (suite.suites) {
      extractSpecs(suite.suites, collected);
    }
  }

  return collected;
}

if (!fs.existsSync(resultsPath)) {
  console.error('Fichier introuvable : test-results/results.json');
  process.exit(1);
}

const rawResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
const tests = extractSpecs(rawResults.suites);

const total = tests.length;
const passed = tests.filter((test) => test.status === 'passed').length;
const skipped = tests.filter((test) => test.status === 'skipped').length;
const failed = tests.filter(
  (test) => test.status !== 'passed' && test.status !== 'skipped'
).length;

const riskLevel = failed > 0 ? 'ÉLEVÉ' : 'FAIBLE';
const decision = failed > 0 ? 'NO GO' : 'GO';

const failedTests = tests.filter(
  (test) => test.status !== 'passed' && test.status !== 'skipped'
);
const summary = {
  project: 'QA AI CI/CD Demo - SauceDemo',
  executionDate: rawResults.stats?.startTime,
  durationMs: rawResults.stats?.duration,
  decision,
  riskLevel,
  totals: {
    total,
    passed,
    failed,
    skipped,
  },
  failedTests,
  recommendation:
    failed > 0
      ? 'Ne pas livrer cette version avant analyse/correction des tests échoués et relance de la non-régression.'
      : 'La livraison peut être envisagée, sous réserve des validations métier habituelles.',
};

fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');

console.log('==============================');
console.log('Résumé QA généré');
console.log('==============================');
console.log(`Projet : ${summary.project}`);
console.log(`Décision : ${decision}`);
console.log(`Niveau de risque : ${riskLevel}`);
console.log(`Tests exécutés : ${total}`);
console.log(`Succès : ${passed}`);
console.log(`Échecs : ${failed}`);
console.log(`Ignorés : ${skipped}`);

if (failedTests.length > 0) {
  console.log('\nTests en échec :');
  failedTests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.title}`);
    console.log(`Fichier : ${test.file}:${test.line}`);
    console.log(`Erreur : ${test.error.split('\n').slice(0, 8).join('\n')}`);
  });
}

console.log('\nRecommandation :');
console.log(summary.recommendation);

console.log(`\nFichier généré : ${outputPath}`);