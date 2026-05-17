const fs = require('fs');
const path = require('path');
const readline = require('readline');

const reviewPath = path.join(__dirname, '..', 'generated', 'script-review.json');
const generatedSpecPath = path.join(__dirname, '..', 'generated', 'saucedemo.generated.spec.js');
const approvedSpecPath = path.join(__dirname, '..', 'tests', 'saucedemo.generated.spec.js');

if (!fs.existsSync(reviewPath)) {
  console.error('Erreur : fichier generated/script-review.json introuvable.');
  console.error('Lance d’abord : node agents/04-script-review-agent.js');
  process.exit(1);
}

if (!fs.existsSync(generatedSpecPath)) {
  console.error('Erreur : fichier generated/saucedemo.generated.spec.js introuvable.');
  console.error('Lance d’abord : node agents/03-playwright-generator-agent.js');
  process.exit(1);
}

const review = JSON.parse(fs.readFileSync(reviewPath, 'utf-8'));

console.log('==============================');
console.log('05_HUMAN_APPROVAL — Validation humaine');
console.log('==============================');
console.log(`Statut de revue : ${review.reviewStatus}`);
console.log(`Niveau de risque : ${review.riskLevel}`);
console.log(`Résumé : ${review.summary || 'Non fourni'}`);
console.log(`Recommandation : ${review.recommendation || 'Non fournie'}`);

if (review.detectedIssues && review.detectedIssues.length > 0) {
  console.log('\nIssues détectées :');
  review.detectedIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
}

if (review.reviewStatus === 'REJECTED') {
  console.log('\nDécision : STOP');
  console.log('Le script est rejeté. Il ne sera pas copié dans le dossier tests/.');
  process.exit(1);
}

console.log('\nAction requise :');
console.log('Tape APPROVE pour autoriser la copie du script généré dans tests/.');
console.log('Tape REJECT pour refuser le script.');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nVotre décision [APPROVE/REJECT] : ', (answer) => {
  const decision = answer.trim().toUpperCase();

  if (decision === 'APPROVE') {
    fs.copyFileSync(generatedSpecPath, approvedSpecPath);

    console.log('\nValidation humaine : APPROVED ✅');
    console.log(`Script copié vers : ${approvedSpecPath}`);
    console.log('Le pipeline peut maintenant exécuter ce test.');
    rl.close();
    process.exit(0);
  }

  if (decision === 'REJECT') {
    console.log('\nValidation humaine : REJECTED ❌');
    console.log('Le script généré ne sera pas exécuté.');
    rl.close();
    process.exit(1);
  }

  console.log('\nRéponse invalide. Relance le script et tape APPROVE ou REJECT.');
  rl.close();
  process.exit(1);
});