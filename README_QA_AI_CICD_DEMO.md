# QA AI CI/CD Demo — Playwright + OpenAI + Slack + Docker

## 1. Objectif du projet

Ce projet est un prototype local de pipeline QA/CI/CD augmenté par l’IA.

L’objectif est de montrer comment une petite équipe peut automatiser une partie de son cycle de livraison logiciel avec une stack simple, reproductible et low-cost.

Le pipeline permet de :

- exécuter des tests automatisés avec Playwright ;
- générer un rapport de test HTML et JSON ;
- analyser les résultats localement ;
- envoyer les résultats à OpenAI pour produire une synthèse QA claire ;
- envoyer automatiquement cette synthèse dans Slack ;
- exécuter toute la chaîne dans Docker pour rendre l’environnement reproductible.

Ce prototype ne cherche pas à remplacer Azure DevOps, GitHub Actions ou GitLab CI.  
Il vise plutôt à démontrer une approche légère pour aider les petites équipes à structurer leur QA/CI-CD avec des outils accessibles.

---

## 2. Stack utilisée

| Outil | Rôle |
|---|---|
| Playwright | Exécution des tests end-to-end |
| SauceDemo | Application web utilisée comme cible de test |
| Node.js | Runtime JavaScript pour les scripts |
| OpenAI API | Génération d’une synthèse IA des résultats QA |
| Slack Webhook | Envoi automatique du rapport dans un canal Slack |
| Docker | Exécution reproductible du pipeline |
| VS Code | Éditeur de développement |

---

## 3. Architecture du pipeline

```text
Playwright
   ↓
test-results/results.json
   ↓
analyze-results.js
   ↓
test-results/qa-summary.json
   ↓
generate-ai-summary.js
   ↓
test-results/ai-summary.txt
   ↓
send-slack-summary.js
   ↓
Slack #qa-ci-cd-demo
```

---

## 4. Structure du projet

```text
qa-ai-cicd-demo/
│
├── tests/
│   └── saucedemo.spec.js
│
├── test-results/
│   ├── results.json
│   ├── qa-summary.json
│   └── ai-summary.txt
│
├── playwright-report/
│
├── analyze-results.js
├── generate-ai-summary.js
├── send-slack-summary.js
├── playwright.config.js
├── package.json
├── package-lock.json
├── Dockerfile
├── .dockerignore
├── .env
└── README.md
```

---

## 5. Prérequis

Avant de lancer le projet, il faut installer :

- Node.js
- npm
- Docker Desktop
- VS Code
- Un compte OpenAI Platform avec une clé API
- Un workspace Slack avec un Incoming Webhook

Vérification rapide :

```powershell
node -v
npm -v
docker --version
```

---

## 6. Installation du projet

Se placer dans le dossier du projet :

```powershell
cd C:\Users\ahmed\qa-ai-cicd-demo
```

Installer les dépendances :

```powershell
npm install
```

Installer les navigateurs Playwright si nécessaire :

```powershell
npx playwright install
```

---

## 7. Variables d’environnement

Créer un fichier `.env` à la racine du projet.

Exemple :

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxxxxx
```

Important :

- ne jamais partager ce fichier ;
- ne jamais le pousser sur GitHub ;
- ne jamais afficher les clés API dans une vidéo ou une capture d’écran.

---

## 8. Configuration Playwright

Le fichier `playwright.config.js` configure Playwright pour :

- exécuter les tests uniquement sur Chromium ;
- générer un rapport HTML ;
- générer un fichier JSON exploitable par l’IA ;
- capturer une screenshot et une vidéo en cas d’échec.

Extrait important :

```js
reporter: [
  ['html', { open: 'never' }],
  ['json', { outputFile: 'test-results/results.json' }],
],
```

Le paramètre `open: 'never'` est important pour éviter que le rapport HTML bloque l’enchaînement automatique du pipeline.

---

## 9. Tests automatisés SauceDemo

Le fichier de test principal se trouve ici :

```text
tests/saucedemo.spec.js
```

Il contient deux scénarios.

### Test 1 — Parcours valide

```text
Login
→ ajout d’un produit au panier
→ checkout
→ confirmation de commande
```

Ce test doit passer.

### Test 2 — Échec volontaire

Ce test est volontairement en échec pour simuler une anomalie exploitable par l’IA.

Il attend le titre :

```text
Dashboard
```

Mais l’application affiche réellement :

```text
Products
```

Ce test permet de démontrer :

- la détection d’un échec ;
- la génération d’un rapport ;
- l’analyse IA ;
- l’envoi d’une notification Slack avec une décision NO GO.

---

## 10. Lancement manuel des tests Playwright

Pour lancer uniquement les tests :

```powershell
npx playwright test
```

Résultat attendu :

```text
1 passed
1 failed
```

L’échec est volontaire.

Pour ouvrir le rapport HTML :

```powershell
npx playwright show-report
```

---

## 11. Génération du résumé QA local

Après l’exécution Playwright, un fichier est généré :

```text
test-results/results.json
```

Ce fichier est ensuite analysé avec :

```powershell
node analyze-results.js
```

Ce script génère :

```text
test-results/qa-summary.json
```

Exemple de résumé généré :

```text
Décision : NO GO
Niveau de risque : ÉLEVÉ
Tests exécutés : 2
Succès : 1
Échecs : 1
```

---

## 12. Génération de la synthèse IA

Le résumé QA est envoyé à OpenAI avec :

```powershell
node generate-ai-summary.js
```

Ce script lit :

```text
test-results/qa-summary.json
```

Puis génère :

```text
test-results/ai-summary.txt
```

La synthèse IA contient :

- une décision GO / NO GO ;
- le niveau de risque ;
- l’erreur principale ;
- l’impact potentiel ;
- une recommandation actionnable.

---

## 13. Envoi du rapport dans Slack

Pour envoyer la synthèse IA dans Slack :

```powershell
node send-slack-summary.js
```

Le message est envoyé dans le canal configuré dans le webhook Slack, par exemple :

```text
#qa-ci-cd-demo
```

---

## 14. Lancement complet du pipeline local

Le fichier `package.json` contient une commande unique :

```json
"qa:pipeline": "playwright test || echo Tests failed but continuing && node analyze-results.js && node generate-ai-summary.js && node send-slack-summary.js"
```

Pour lancer toute la chaîne :

```powershell
npm run qa:pipeline
```

Cette commande exécute :

```text
1. Tests Playwright
2. Génération du rapport JSON
3. Analyse QA locale
4. Synthèse IA OpenAI
5. Envoi Slack
```

Même si un test échoue, la suite continue afin de générer le rapport IA et notifier Slack.

---

## 15. Dockerisation du projet

Docker permet d’exécuter le pipeline dans un environnement stable et reproductible.

L’image utilisée est basée sur l’image officielle Playwright :

```dockerfile
FROM mcr.microsoft.com/playwright:v1.60.0-jammy
```

Cette image contient déjà :

- Node.js ;
- Playwright ;
- les dépendances système nécessaires ;
- les navigateurs supportés.

---

## 16. Fichier `.dockerignore`

Le fichier `.dockerignore` permet d’éviter de copier des fichiers inutiles ou sensibles dans l’image Docker.

Contenu :

```dockerignore
node_modules
playwright-report
test-results
.env
.git
```

Le fichier `.env` n’est volontairement pas copié dans l’image.  
Les variables sont injectées au moment du lancement du conteneur.

---

## 17. Dockerfile

Le fichier `Dockerfile` contient :

```dockerfile
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "qa:pipeline"]
```

Explication :

```text
FROM       utilise une image Playwright officielle
WORKDIR    définit le dossier de travail dans le conteneur
COPY       copie les fichiers nécessaires
RUN        installe les dépendances npm
CMD        lance le pipeline par défaut
```

---

## 18. Construire l’image Docker

Depuis la racine du projet :

```powershell
docker build -t qa-ai-cicd-demo .
```

Résultat attendu :

```text
Successfully tagged qa-ai-cicd-demo:latest
```

Dans Docker Desktop, l’image apparaît avec le nom :

```text
qa-ai-cicd-demo
```

---

## 19. Lancer le pipeline dans Docker

Pour exécuter le pipeline dans Docker :

```powershell
docker run --rm --env-file .env qa-ai-cicd-demo
```

Explication :

```text
docker run              lance un conteneur
--rm                    supprime le conteneur après exécution
--env-file .env          injecte les variables OpenAI et Slack
qa-ai-cicd-demo          nom de l’image Docker
```

Résultat attendu :

```text
1 failed
1 passed
Résumé QA généré
Synthèse IA générée
Message envoyé dans Slack
```

Un nouveau message doit apparaître dans Slack.

---

## 20. Pourquoi Docker rend le pipeline reproductible

Sans Docker, l’exécution dépend de la machine locale :

- version de Node.js ;
- dépendances système ;
- navigateurs installés ;
- configuration Windows ;
- versions npm ;
- chemins locaux.

Avec Docker, l’environnement est standardisé :

```text
Même image
Même version Playwright
Même dépendances
Même commande
Même comportement
```

Cela permet de partager le projet avec une autre personne ou une autre équipe, et d’obtenir une exécution plus prévisible.

---

## 21. Commandes utiles

Lancer les tests uniquement :

```powershell
npx playwright test
```

Afficher le rapport Playwright :

```powershell
npx playwright show-report
```

Analyser les résultats :

```powershell
node analyze-results.js
```

Générer la synthèse IA :

```powershell
node generate-ai-summary.js
```

Envoyer dans Slack :

```powershell
node send-slack-summary.js
```

Lancer tout le pipeline local :

```powershell
npm run qa:pipeline
```

Construire l’image Docker :

```powershell
docker build -t qa-ai-cicd-demo .
```

Lancer le pipeline dans Docker :

```powershell
docker run --rm --env-file .env qa-ai-cicd-demo
```

---

## 22. Résultat attendu dans Slack

Exemple de message :

```text
🚦 Rapport QA/CI-CD automatisé

Décision : NO GO
Niveau de risque : ÉLEVÉ

Tests exécutés : 2
Tests réussis : 1
Tests échoués : 1

Erreur principale :
Expected: "Dashboard"
Received: "Products"

Recommandation :
Ne pas livrer cette version avant correction et relance de la non-régression.
```

---

## 23. Limites actuelles du prototype

Cette V1 reste volontairement simple.

Limites actuelles :

- un seul site de test : SauceDemo ;
- un seul navigateur : Chromium ;
- un échec volontaire ;
- pas encore de vraie intégration n8n ;
- pas encore de ticket automatique Jira/GitHub Issue ;
- pas encore de stockage historique des résultats ;
- pas encore de dashboard de suivi.

---

## 24. Prochaines améliorations possibles

Prochaines étapes envisagées :

- intégrer n8n comme orchestrateur ;
- déclencher le pipeline via webhook ;
- ajouter un agent IA plus avancé ;
- classifier les erreurs : bug produit, faux positif, problème de test, problème d’environnement ;
- créer automatiquement un ticket ;
- relancer uniquement les tests échoués ;
- ajouter Allure Report ;
- stocker les rapports dans un dossier partagé ;
- créer un dashboard de suivi qualité ;
- déployer le pipeline sur un VPS low-cost.

---

## 25. Vision du projet

Ce prototype montre qu’il est possible de créer une chaîne QA/CI-CD augmentée par l’IA avec une stack simple, accessible et peu coûteuse.

L’objectif n’est pas de remplacer les grandes plateformes DevOps, mais de proposer une alternative légère pour les équipes qui veulent :

- mieux tester ;
- mieux comprendre leurs anomalies ;
- réduire les risques avant livraison ;
- automatiser les notifications ;
- rendre la qualité plus visible ;
- intégrer l’IA dans le cycle de livraison logiciel.
