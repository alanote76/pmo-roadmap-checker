import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;
export const runtime = 'nodejs';

// Allow large file uploads (base64 encoded slides)
export const dynamic = 'force-dynamic';

const ANALYSIS_PROMPT = `Tu es un expert PMO (Project Management Office) chargé d'évaluer la conformité d'une feuille de route projet.

## GABARIT DE RÉFÉRENCE
La feuille de route doit respecter le gabarit PMO suivant :
- **Format** : Diagramme de Gantt en paysage, titre "FEUILLE DE ROUTE" en haut à gauche
- **Légende obligatoire** en haut à droite avec 6 statuts et codes couleur :
  - Vert : Clôturé
  - Bleu : Pas d'alerte
  - Jaune/Orange : Démarré, risque modéré ou faible retard
  - Rouge : Non démarré, Risque élevé ou fort retard
  - Gris clair : Nouveau / A planifier
  - Gris : Suspendu

- **Axe temporel** horizontal avec mois et semaines
- **Ligne verticale pointillée** (avec triangle) indiquant la date de référence

- **6 catégories (lignes) obligatoires** :
  1. POLITIQUE / GOUVERNANCE — avec jalons COPIL (picto pentagone/flèche + label "COPIL" + date si applicable)
  2. ÉCONOMIQUE (BUDGET) — estimation projet, échéances paiements
  3. STRATÉGIQUE (SD & BP) — modèle économique, décrets, études
  4. IMPLÉMENTATION — Conception, Développement, Tests, Tests de charge, Tests de sécurité, Recette tech, Recette fonctionnelle, Migration, Mise en production
  5. IMPACT SOCIÉTAL, ENVIRONNEMENTAL — EEIES ou études d'impact
  6. JURIDIQUE, MARCHÉS PUBLIQUES — TDR, Marchés (construction, hébergement, etc.)

- **Pictos** :
  - Les jalons (COPIL, MEP, Go/NoGo) utilisent un picto pentagone (forme flèche) avec le label à côté
  - Les activités sont des barres rectangulaires (durée proportionnelle à la timeline)
  - La Mise en production doit être un jalon ponctuel (picto), PAS une barre étalée

## CRITÈRES D'ÉVALUATION (100 points total)

Évalue chaque critère et attribue un score :

### 1. Conformité au gabarit (15 pts)
- Le template PMO officiel est-il utilisé ? (mise en page, couleurs, style)
- Le titre "FEUILLE DE ROUTE" est-il présent ?
- La légende des statuts est-elle complète et correcte ?
- Les éléments graphiques sont-ils cohérents (triangles décoratifs en haut, numéro de slide) ?

### 2. Gouvernance et instances (15 pts)
- Des COPIL sont-ils planifiés avec des dates précises ?
- La fréquence des COPIL est-elle régulière et adaptée ?
- Les pictos pentagone sont-ils utilisés pour les jalons ?
- Y a-t-il un COPIL de Go/NoGo avant la MEP ?

### 3. Complétude des phases d'implémentation (15 pts)
- Les phases sont-elles complètes : Conception → Développement → Tests → Recette → Migration → MEP ?
- Les tests de charge et tests de sécurité sont-ils prévus ?
- La recette technique ET fonctionnelle sont-elles distinctes ?
- Y a-t-il un kick-off identifiable ?

### 4. Précision de la MEP (10 pts)
- La mise en production est-elle un jalon ponctuel (date précise) ?
- Si la MEP est étalée sur plusieurs semaines → score très bas
- Un Go/NoGo est-il prévu avant la MEP ?

### 5. Budget et échéances de paiement (10 pts)
- L'estimation du projet est-elle renseignée ?
- Les échéances de paiement sont-elles indiquées ?
- Sont-elles cohérentes avec les TDR et pourcentages mentionnés ?

### 6. Volet juridique et marchés (10 pts)
- Les TDR sont-ils identifiés ?
- Les marchés publics nécessaires sont-ils listés ?
- Les durées des marchés semblent-elles réalistes ?

### 7. Impact sociétal et environnemental (5 pts)
- Une EEIES ou étude d'impact est-elle prévue ?
- Est-elle positionnée au bon moment (avant ou en début de projet) ?

### 8. Cohérence temporelle (10 pts)
- Les dates sont-elles logiques (pas de chevauchement incohérent) ?
- Les dépendances entre phases semblent-elles respectées ?
- La timeline globale est-elle réaliste ?

### 9. Statuts et codes couleur (5 pts)
- Les couleurs utilisées correspondent-elles à la légende ?
- Les statuts sont-ils cohérents avec l'avancement visible ?

### 10. Tests d'acceptance (5 pts)
- Des tests d'acceptance/recette utilisateur sont-ils prévus ?
- Sont-ils positionnés après les recettes techniques ?

## FORMAT DE RÉPONSE

Réponds UNIQUEMENT en JSON valide (sans markdown, sans backticks, sans commentaire) avec cette structure exacte :

{
  "globalScore": <number>,
  "maxScore": 100,
  "percentage": <number 0-100>,
  "grade": "<A+ / A / B+ / B / C / D / F>",
  "summary": "<résumé en 2-3 phrases de l'évaluation globale>",
  "criteria": [
    {
      "name": "<nom du critère>",
      "score": <number>,
      "maxScore": <number>,
      "status": "<pass|warning|fail>",
      "details": "<explication de l'évaluation>",
      "recommendations": ["<recommandation 1>", "<recommandation 2>"]
    }
  ],
  "generalRecommendations": ["<recommandation générale 1>", "<recommandation générale 2>"]
}

Barème des grades : A+ (90-100), A (80-89), B+ (70-79), B (60-69), C (50-59), D (40-49), F (<40)

Sois précis, exigeant mais juste. Identifie les points forts et les manquements concrets. Donne des recommandations actionables.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans les variables d\'environnement Vercel.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { images, fileName, isPptx, accessCode } = body;

    // Vérifier le code d'accès
    const validCode = process.env.ACCESS_CODE;
    if (validCode && accessCode !== validCode) {
      return NextResponse.json({ error: 'Code d\'accès invalide.' }, { status: 403 });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Aucune donnée de slide fournie' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    // Build content array - using 'any' to support document type not yet in SDK types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];

    if (isPptx) {
      // PPTX: send as document for Claude to parse
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          data: images[0].data,
        },
      });
      content.push({
        type: 'text',
        text: `Voici une feuille de route PMO au format PowerPoint (fichier: "${fileName}"). Analyse le contenu en détail — les textes, la structure, les éléments présents ou absents.

Note: Comme c'est un fichier PowerPoint brut, concentre-toi sur le CONTENU (textes, phases, dates, catégories présentes) plutôt que sur la présentation visuelle détaillée. Pour une analyse visuelle complète, l'utilisateur devrait uploader un PDF.

${ANALYSIS_PROMPT}`,
      });
    } else {
      // PDF images: send each slide as image for vision analysis
      for (let i = 0; i < images.length; i++) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: images[i].mediaType,
            data: images[i].data,
          },
        });
      }
      content.push({
        type: 'text',
        text: `Voici ${images.length} slide(s) d'une feuille de route PMO (fichier: "${fileName}"). Analyse visuellement CHAQUE slide en détail — regarde la mise en page, les couleurs, les pictos, les formes, les textes, les barres, les jalons.

${ANALYSIS_PROMPT}`,
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Pas de réponse de Claude' }, { status: 500 });
    }

    // Parse JSON from response
    let jsonText = textContent.text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(jsonText);
    } catch {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisResult = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'Impossible de parser la réponse de Claude. Réessayez.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Réponse inattendue de Claude. Réessayez.' },
          { status: 500 }
        );
      }
    }

    // Validate structure
    if (!analysisResult.globalScore || !analysisResult.criteria) {
      return NextResponse.json(
        { error: 'Réponse incomplète de Claude. Réessayez.' },
        { status: 500 }
      );
    }

    return NextResponse.json(analysisResult);
  } catch (error: unknown) {
    console.error('Analysis error:', error);
    
    const message = error instanceof Error ? error.message : 'Erreur interne';
    
    if (message.includes('api_key') || message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Clé API invalide. Vérifiez ANTHROPIC_API_KEY dans vos variables d\'environnement Vercel.' },
        { status: 401 }
      );
    }

    if (message.includes('rate_limit') || message.includes('overloaded')) {
      return NextResponse.json(
        { error: 'API Claude surchargée. Réessayez dans quelques secondes.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
