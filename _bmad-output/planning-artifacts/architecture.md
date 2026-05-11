---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - Cession Mars 2026.csv (analysé)
  - PLANNING 2026 CSS.xlsx (référence)
workflowType: 'architecture'
project_name: 'time_verifier'
user_name: 'Kaleba'
date: '2026-04-27'
lastStep: 8
status: 'complete'
completedAt: '2026-05-11'
updatedAt: '2026-05-11'
lastUpdate: 'Added multi-sheet XLSX validation and manager permissions'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
- Authentication & Authorization (FR1-FR5): Email/password avec rôles RH/Manager
- File Management (FR6-FR12): Upload CSV/XLSX, validation templates
- Comparison & Matching (FR13-FR19): Comparaison planning vs réalité
- Dashboard & Reporting (FR20-FR23): Affichage retards/absences
- Activity Management (FR24-FR26): Gestion activités/managers
- Audit & History: Journal modifications avec traçabilité

**Non-Functional Requirements:**
- Performance: Traitement fichier CSV max 5 minutes avec progress
- Security: Chiffrement mots de passe, sessions sécurisées
- Scalability: 7-10 managers + 2 RH simultanés

**Technology Stack:**
- Frontend: React 19 + Vite 8 + TypeScript
- Backend: Express 5 + MongoDB/Mongoose + TypeScript
- Auth: JWT + bcrypt

## Core Architectural Decisions

### Data Architecture
- Database: MongoDB via Mongoose
- Validation: Zod (recommended)
- Caching: None (MVP)

### Authentication & Security
- Auth: JWT tokens (stateless)
- Password Hashing: bcrypt
- Sessions: HTTP-only cookies
- API Security: Helmet + rate limiting

### Frontend Architecture
- State: React Context + hooks
- Routing: React Router v7
- Forms: React Hook Form

## Implementation Patterns & Consistency Rules

### Naming Patterns
- **Database:** snake_case (activities, employees, plannings)
- **API Routes:** /api/v1/{resource} plural
- **Code:** camelCase variables, PascalCase components, kebab-case files

### Structure Patterns
- **Client:** src/{features, components, pages, hooks, services}/
- **Server:** src/{routes, models, middleware, services, controllers}/

### API Response Formats
- Success: `{ data: {...}, meta?: {...} }`
- Error: `{ error: { code: string, message: string } }`
- Dates: ISO 8601 strings

## Project Structure & Boundaries

### Client (Frontend) Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   └── layout/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── planning/
│   │   ├── activities/
│   │   └── history/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── context/
│   ├── types/
│   └── utils/
├── public/
└── dist/
```

### Server (Backend) Structure
```
server/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── activities.ts
│   │   ├── employees.ts
│   │   ├── plannings.ts
│   │   └── comparisons.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Activity.ts
│   │   ├── Employee.ts
│   │   ├── Planning.ts
│   │   └── AuditLog.ts
│   ├── middleware/
│   ├── services/
│   ├── controllers/
│   ├── utils/
│   ├── config/
│   └── index.ts
├── uploads/
└── dist/
```

### API Endpoints
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- GET/POST /api/v1/activities
- GET/POST /api/v1/employees
- GET/POST /api/v1/plannings
- POST /api/v1/comparisons/upload
- GET /api/v1/comparisons/results
- GET /api/v1/audit-logs

### Requirements Mapping
- Auth (FR1-FR5) → auth.ts routes + User model
- File Upload (FR6-FR12) → file.service.ts + plannings.ts
- Comparison (FR13-FR19) → comparison.service.ts
- Dashboard (FR20-FR23) → comparisons.ts + dashboard feature
- Activity (FR24-FR26) → activities.ts routes + Activity model
- Audit (FR27-FR29) → AuditLog model + history feature

### Integration Points
- Client → Server: REST API via fetch/axios
- File upload: Multer → local storage
- Auth: JWT in HTTP-only cookies

## Architecture Validation Results

### Coherence Validation ✅
- Tech stack compatible (React 19 + Express 5 + MongoDB + JWT + bcrypt)
- Patterns alignés avec les choix technologiques
- Structure cohérente avec les patterns définis

### Requirements Coverage Validation ✅
- Toutes les FRs supportées architecturalement
- NFRs addressées (performance, security, scalability)

### Implementation Readiness Validation ✅
- Decisions complètes avec versions
- Patterns suffisamment clairs pour consistent implementation
- Structure complète avec boundaries

## Risk Mitigation & Guards

### Performance Guards
- **File Processing:** Use streams for files >1000 rows to avoid memory issues
- **Progress Tracking:** Real-time progress feedback during CSV comparison
- **Timeout Handling:** Configurable max processing time (default: 5 minutes)
- **Chunk Processing:** Process large files in chunks of 1000 rows

### Data Integrity Rules
- **Entity Matching:** Prefer `employeeId` over `name` when available in both sources
- **Validation:** Strict schema enforcement with Zod on all inputs
- **Fallback Strategy:** Log ambiguous matches for manual review queue
- **Deduplication:** Prevent duplicate entries via unique constraints

### Exception Handling
- **Holidays:** Support exclude dates list from comparison logic
- **Approved Leaves:** Mark approved leaves as excused in comparison results
- **Edge Cases:** Document all edge cases in comparison service
- **Graceful Degradation:** Partial results even if some rows fail

### Security Guards
- **Input Sanitization:** Sanitize all file uploads before processing
- **Rate Limiting:** Prevent abuse with request rate limits
- **Audit Trail:** Log all modifications with before/after values

---

## File Format Specifications

### CSV Hikvision (Pointage Réel)

**Colonnes attendues:**
| Colonne | Type | Description | Usage |
|---------|------|-------------|-------|
| `Identifiant de la personne` | String | Matricule système (ex: '00000001) | **🔑 CLÉ DE MATCHING** |
| `Nom` | String | Nom complet employé | Fallback matching |
| `Service` | String | Départment/Service | Affichage |
| `Heure` | DateTime | Timestamp du pointage (2026-02-20 07:51:33) | Calcul présence |
| `État de présence` | String | Normal/Retard/Absence | Validation |
| `Point de vérification` | String | ENTREE/SORTIE | Calcul heures travail |

**Structure:**
- Un pointage par ligne (plusieurs lignes par employé par jour)
- Format datetime: `YYYY-MM-DD HH:MM:SS`
- Entrées = début journée, Sorties = fin journée
-Fichier généré **mensuellement**

---

### XLSX Planning (Prévision)

**Structure du fichier:**
- **Multiple feuilles (tabs):** Chaque feuille = une activité
- **Nom de la feuille:** Nom exact de l'activité (doit correspondre à la BDD)
- Une ligne par employé par jour de la semaine

**Colonnes attendues (chaque feuille):**
| Colonne | Type | Description | Usage |
|---------|------|-------------|-------|
| `matricule` | String | Matricule employé | **🔑 CLÉ DE MATCHING** |
| `nom` | String | Nom complet | Affichage |
| `jour` | Date | Date du jour (YYYY-MM-DD) | Matching date |
| `heure_entree` | Time | Heure d'entrée prévue | Comparaison |
| `heure_sortie` | Time | Heure de sortie prévue | Comparaison |
| `service` | String | Department | Organisation |

---

#### Validation des feuilles (Sheet Validation)

**Règles de sécurité:**
1. **Nom de feuille = activité:** Le nom de chaque feuille doit correspondre exactement à une activité existante en base
2. **Feuille inexistante:** Si le nom de feuille ne correspond à aucune activité → **ERREUR** + reject du fichier
3. **Activité non assignée:** Si le manager n'est pas responsable de cette activité → **ERREUR** + reject

**Gestion des permissions:**
```
SI utilisateur.role == 'super_manager':
    PEUT uploader toutes activités
SINON SI utilisateur.role == 'manager':
    PEUT uploader uniquement ses activités (activity.manager_id == user.id)
SINON:
    INTERDIT upload planning
```

**Flux de validation:**
1. Parser toutes les feuilles du fichier XLSX
2. Pour chaque feuille: vérifier que l'activité existe
3. Vérifier permission: manager → activity assignment
4. Si erreur → retourne détail: {feuille: "Nettoyage", erreur: "Activité non trouvée ou non assignée"}

---

### Matching Strategy

**Employee Matching:**
- **Primary:** `matricule` (Planning) ↔ `Identifiant de la personne` (CSV)
- **Fallback:** `nom` (fuzzy matching si matricule absent)
- **Validation:** Normaliser les IDs (enlever les quotes, trim)

**Date Matching:**
- Planning: données hebdomadaires →agréger par mois
- CSV Hikvision: données mensuelles
- **Comparaison mensuelle:** Grouper par mois (Feb 2026, Mar 2026, etc.)
- Pour chaque jour du mois: comparer pointage réel vs planning

**Matching Algorithm:**
```
Pour chaque mois:
  Pour chaque employé dans planning:
    Pour chaque jour du mois:
      - Récupérer pointages Hikvision du jour
      - Comparer: heure entrée réelle vs prévue
      - Calculer: retard (si >15min), absence (si aucun pointage)
```

---

### Template XLSX à générer

Le template de planning devra être téléchargable via l'app (FR9):
```
Semaine du: [Date début]
| matricule | nom | service | lun | mar | mer | jeu | ven | sam | dim |
| --------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- |
```

---

## Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

---

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION ✅

**Confidence Level:** High

**Key Strengths:**
- Stack moderne et bien définie
- Patterns clairs pour consistance AI agents
- Structure complète avec Requirements mapping
- Validation complète passé

**Areas for Future Enhancement:**
- Tests automatisés (post-MVP)
- API documentation (Swagger)
- Analytics dashboard

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. Setup MongoDB models (User, Activity, Employee, Planning, AuditLog)
2. Setup auth middleware (JWT + bcrypt)
3. Build auth routes