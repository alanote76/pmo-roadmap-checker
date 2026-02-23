# PMO Roadmap Checker

Outil de vérification automatique de la conformité des feuilles de route PMO, propulsé par Claude Vision AI.

## Fonctionnalités

- Upload de fichiers PPT, PPTX ou PDF
- Analyse automatique via Claude Vision (contenu + présentation visuelle)
- Score de conformité sur 100 points avec 10 critères
- Recommandations détaillées par critère
- Interface moderne et responsive

## Déploiement sur Vercel

### Prérequis
1. Un compte [Vercel](https://vercel.com)
2. Un compte [GitHub](https://github.com)
3. Une clé API [Anthropic](https://console.anthropic.com)

### Étapes

1. **Créer le repo GitHub**
   - Aller sur github.com → New repository
   - Nom : `pmo-roadmap-checker`
   - Laisser public ou privé, puis créer

2. **Pousser le code**
   ```bash
   cd pmo-checker
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/VOTRE_USERNAME/pmo-roadmap-checker.git
   git push -u origin main
   ```

3. **Déployer sur Vercel**
   - Aller sur [vercel.com/new](https://vercel.com/new)
   - Importer le repo `pmo-roadmap-checker`
   - Dans "Environment Variables", ajouter :
     - `ANTHROPIC_API_KEY` = votre clé API Anthropic (commence par `sk-ant-`)
   - Cliquer sur Deploy

4. **C'est en ligne !**

## Critères d'évaluation (100 pts)

| Critère | Points |
|---------|--------|
| Conformité au gabarit | 15 |
| Gouvernance et instances | 15 |
| Complétude implémentation | 15 |
| Précision MEP | 10 |
| Budget et paiements | 10 |
| Juridique et marchés | 10 |
| Impact sociétal/environnemental | 5 |
| Cohérence temporelle | 10 |
| Statuts et codes couleur | 5 |
| Tests d'acceptance | 5 |

## Développement local

```bash
cp .env.local.example .env.local
# Éditer .env.local avec votre clé API
npm install
npm run dev
```
