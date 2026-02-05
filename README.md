# Roadmap App

Application web de gestion de roadmaps IT, connectee a Jira.

## Le Probleme d'Origine

Avant cette application, la gestion des roadmaps IT se faisait via **plusieurs fichiers Excel** :
- `2026-Roadmap logistique.xlsx`
- `2026-roadmap MAIA.xlsx`
- `Roadmap SAV.xlsx`
- `Roadmap Veepee+GMP.xlsx`
- `Roadmap WIMM.xlsx`

### Les problemes avec Excel :
- **Pas de source unique de verite** : Chaque fichier vivait sa vie, avec des doublons et des incoherences
- **Synchronisation manuelle avec Jira** : Il fallait copier/coller les tickets Jira a la main
- **Pas de visibilite temps reel** : Les statuts n'etaient jamais a jour
- **Difficulte de collaboration** : Qui a la derniere version ? Conflits de fichiers
- **Pas d'historique** : Impossible de savoir qui a change quoi et quand
- **Interface peu ergonomique** : Excel n'est pas fait pour ca

## La Solution

Une application web moderne qui :

### Centralise les donnees
- **Une seule source de verite** pour tous les projets (Logistique, MAIA, SAV, Veepee, WIMM)
- Base de donnees SQLite locale, facile a sauvegarder

### Se connecte a Jira
- **Import simplifie** : Recherche par projet Jira (SIDEV, SUPPIT) sans ecrire de JQL
- **Filtres intuitifs** : Projet, statut, recherche texte
- **Detection automatique** : Les tickets deja importes sont masques
- **Navigation intelligente** : Apres import, on arrive directement sur le(s) ticket(s)

### Offre plusieurs vues
- **Vue Cartes** : Apercu visuel rapide des tickets
- **Vue Tableau** : Edition en masse, tri par colonnes, colonnes personnalisees
- **Vue Timeline** : Visualisation chronologique

### Permet la personnalisation
- **Colonnes par projet** : Chaque projet peut avoir ses propres champs
- **Champs par ticket** : Ajout de champs specifiques a un ticket
- **Priorite metier** : Distincte de la priorite Jira, geree par les metiers

### Garde l'historique
- Suivi des modifications
- Commentaires avec auteur et date

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Base de donnees | SQLite + Prisma ORM |
| Integration | Jira API (jira.js) |

## Installation

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Cloner le repo
git clone <repo-url>
cd roadmap-app

# Installer les dependances
npm install

# Configurer la base de donnees
cd backend
npx prisma db push
cd ..

# Lancer l'application
npm run dev
```

L'application sera disponible sur :
- Frontend : http://localhost:5173
- Backend : http://localhost:3001

### Configuration Jira

1. Aller dans Settings
2. Entrer votre email Atlassian
3. Generer un API token sur https://id.atlassian.com/manage-profile/security/api-tokens
4. Coller le token
5. Tester la connexion

## Utilisation

### Page d'accueil
Selectionnez un service (Logistique, MAIA, SAV, Veepee, WIMM) ou "Voir tout"

### Dashboard
- **Filtres** : Recherche, projet, statut - tout sur une ligne
- **Vues** : Basculez entre Cartes, Tableau, Timeline
- **Import Jira** : Cliquez sur "Importer Jira" pour chercher et importer des tickets

### Vue Tableau
- **Edition inline** : Cliquez sur une cellule pour editer
- **Colonnes personnalisees** : Ajoutez vos propres colonnes par projet
- **Defilement intelligent** : Boutons de navigation + scroll horizontal

### Fiche Ticket
- Modifier le statut, la priorite metier, les commentaires
- Ajouter des champs personnalises specifiques au ticket
- Voir l'historique des modifications

## Impact

### Avant
- 5+ fichiers Excel a maintenir
- Copier/coller manuel depuis Jira
- Aucune visibilite temps reel
- Conflits de versions

### Apres
- 1 application centralisee
- Import Jira en 2 clics
- Donnees toujours a jour
- Collaboration simplifiee
- Historique complet

---

Developpe avec Claude Code
