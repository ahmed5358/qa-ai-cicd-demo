const fs = require('fs');
const path = require('path');
const readline = require('readline');

const repairSuggestionPath = path.join(__dirname, '..', 'generated', 'repair-suggestion.json');
const repairedSpecPath = path.join(__dirname, '..', 'generated', 'saucedemo.repaired.spec.js');
const approvedSpecPath = path.join(__dirname, '..', 'tests', 'saucedemo.generated.spec.js');

if (!fs.existsSync(repairSuggestionPath)) {
  console.error('Erreur : fichier generated/repair-suggestion.json introuvable.');
  console.error('Lance d’abord : node agents/06-repair-suggestion-agent.js');
  process.exit(1);
}

if (!fs.existsSync(repairedSpecPath)) {
  console.error('Erreur : fichier generated/saucedemo.repaired.spec.js introuvable.');
  console.error('Lance d’abord : node agents/06-repair-suggestion-agent.js');
  process.exit(1);
}

const repairSuggestion = JSON.parse(fs.readFileSync(repairSuggestionPath, 'utf-8'));
const repairedCode = fs.readFileSync(repairedSpecPath, 'utf-8');

console.log('==============================');
console.log('07_REPAIR_APPROVAL — Validation humaine de la correction');
console.log('==============================');

console.log(`Statut réparation : ${repairSuggestion.repairStatus}`);
console.log(`Type d'échec : ${repairSuggestion.failureType}`);
console.log(`Risque : ${repairSuggestion.riskLevel}`);
console.log(`Validation humaine requise : ${repairSuggestion.humanReviewRequired}`);

console.log('\nCause probable :');
console.log(repairSuggestion.rootCause || 'Non fournie');

console.log('\nExplication :');
console.log(repairSuggestion.explanation || 'Non fournie');

console.log('\nCorrections proposées :');
(repairSuggestion.suggestedFixes || []).forEach((fix, index) => {
  console.log(`${index + 1}. ${fix}`);
});

console.log('\nAperçu du script réparé :');
console.log('------------------------------');
console.log(repairedCode.split('\n').slice(0, 25).join('\n'));
console.log('------------------------------');

console.log('\nAction requise :');
console.log('Tape APPROVE pour remplacer le test actuel par le script réparé.');
console.log('Tape REJECT pour refuser la correction.');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nVotre décision [APPROVE/REJECT] : ', (answer) => {
  const decision = answer.trim().toUpperCase();

  if (decision === 'APPROVE') {
    fs.copyFileSync(repairedSpecPath, approvedSpecPath);

    console.log('\nCorrection validée : APPROVED ✅');
    console.log(`Script réparé copié vers : ${approvedSpecPath}`);
    console.log('Tu peux maintenant relancer le test généré.');
    rl.close();
    process.exit(0);
  }

  if (decision === 'REJECT') {
    console.log('\nCorrection refusée : REJECTED ❌');
    console.log('Le script réparé ne sera pas utilisé.');
    rl.close();
    process.exit(1);
  }

  console.log('\nRéponse invalide. Relance le script et tape APPROVE ou REJECT.');
  rl.close();
  process.exit(1);
});