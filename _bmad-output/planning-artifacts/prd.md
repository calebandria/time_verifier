---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments: []
workflowType: 'prd'
releaseMode: 'phased'
status: 'complete'
---

# Product Requirements Document - time_verifier

**Author:** Kaleba
**Date:** 2026-04-25

## Executive Summary

Time Verifier est une application web de comparaison automatique entre le planning prévisionnel des employés et la réalité d'assiduité enregistrée via les fichiers Hikvision. Elle permet aux managers et RH de détecter rapidement les retards et absences non notifiées, avec traçabilité complète des modifications et gestion des exceptions.

**Fonctionnalités clés:**
- Upload planning (XLSX) et réalité (CSV Hikvision)
- Comparaison automatique avec détection retards/absences
- Gestion des leaves imprévisibles (modification manager validée par Hikvision)
- Gestion des retards excitables (signalement préalable → pas de pénalité)
- Historique des modifications avec traçabilité
- Permissions différenciées RH (globale) vs Manager (équipe)

### Ce qui rend le produit spécial

- Intégration transparente planning manager et réalité Hikvision
- Détection automatique des écarts
- Système d'exceptions (leave, retard excusable) pour éviter fausses pénalités
- Journal d'audit complet pour conformité RH

## Project Classification

- **Type:** Application Web (React + Node.js + TypeScript)
- **Domaine:** RH / Gestion du temps et présence employé
- **Complexité:** Moyenne-Haute (intégration fichiers, traçabilité audit, permissions)
- **Contexte:** Greenfield

## Success Criteria

### User Success
- Comparison planning/réalité automatique après upload
- Design intuitif (pas de formation nécessaire)
- 7-10 Managers + 2 RH

### Business Success
- CI/CD deployment
- Logging secure par utilisateur

### Technical Success
- Login authentifié par utilisateur
- Permissions différenciées par rôle
- Vue Manager (équipe) vs RH (globale)

### Product Scope

#### MVP
- Upload XLSX/CSV
- Comparison automatique
- Historique modifications
- Exceptions (leave, retard excusable)
- Modèle XLSX disponible pour saisie

#### Growth
- Login/Sécurité
- Dashboard analytics

#### Vision
- API pour intégration externe
- Notifications automatiques

## Règles Métier

- **Upload RH CSV:** Du 20 du mois jusqu'à fin du mois uniquement
- **Modification Manager retard:** Avant le 19 (inclus) pour les dates avant ce jour
- **Modification après 19:** Erreur (non comptabilisé)

## User Journeys

### RH (2 utilisateurs)

**Parcours:**
1. Login → Écran d'upload CSV Hikvision
2. Upload CSV → Waiting state informatif
3. Résultat: Dashboard avec nombre de retards, nombre d'absences
4. Erreur: Affichage du problème

**Upload liste employés:**
- Upload XLSX contenant liste employés par activité
- Matricule = Identifiant unique

### Manager (7-10 utilisateurs)

**Parcours:**
1. Login → Liste des activités assignées
2. Clic activité → Upload planning XLSX
3. Modèle XLSX disponible comme aide
4. Erreurs: Template incorrect, employé non trouvé

**Modification retard:**
- Notification orale du retard (pas via application)
- Modification posible avant jour 19 → jour 19 inclus
- Après jour 19 → Erreur

## Technical Architecture

- **Authentification:** Email/password (local)
- **Base de données:** NoSQL
- **API:** REST
- **Stockage:** Fichiers locaux (serveur)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche:** Phased deployment
**Phase 1:** MVP (core features)
**Phase 2:** Growth features
**Phase 3:** Vision/Expansion

### MVP Feature Set (Phase 1)

**Core User Journeys:**
- RH: Upload CSV, Dashboard résultats
- Manager: Liste activités, Upload planning XLSX

**Must-Have Capabilities:**
- Upload CSV/XLSX
- Matching automatique planning vs réalité
- Dashboard retards/absences
- Liste activités Manager
- Modèle XLSX
- Erreurs template/employé non trouvé

### Post-MVP Features

**Phase 2:**
- Login/Sécurité (Email/password)
- Dashboard analytics
- Historique modifications complet

**Phase 3:**
- API pour intégration externe
- Notifications automatiques

### Risk Mitigation

**Techniques:** Comparison automatisée basée sur règles
**Marché:** Validation utilisateur proche
**Ressources:** Équipe réduite (7-10 managers, 2 RH)

## Functional Requirements

### Authentication & Authorization

- FR1: Users can authenticate with email/password
- FR2: System can validate user credentials against stored hashes
- FR3: System can assign role-based permissions (RH or Manager)
- FR4: RH users can view all activities and employees
- FR5: Manager users can view only assigned activities and team members

### File Management

- FR6: RH users can upload CSV Hikvision files
- FR7: RH users can upload XLSX employee lists per activity
- FR8: Manager users can upload XLSX planning files
- FR9: Users can download XLSX template for planning input
- FR10: System can validate file format and structure
- FR11: System can display errors for invalid templates or unknown employees
- FR12: System can show progress/waiting state during processing

### Comparison & Matching

- FR13: System can compare planning data against Hikvision records
- FR14: System can calculate number of delays for each employee
- FR15: System can calculate number of absences for each employee
- FR16: System can identify employees with leave modifications
- FR17: System can exclude validated leaves from absence count
- FR18: System can exclude pre-notified delays from delay count
- FR19: System can enforce modification deadline (before day 19)

### Dashboard & Reporting

- FR20: RH users can view dashboard with delay counts
- FR21: RH users can view dashboard with absence counts
- FR22: Dashboard can show current period data
- FR23: System can display processing errors clearly

### Activity Management

- RH users can create activities/projects
- RH users can assign managers to activities
- Manager users can view assigned activities list

### Audit & History

- FR24: System can log all modifications with user, timestamp, old/new values
- FR25: Users can view modification history
- FR26: System can restore previous planning versions

### Permissions & Security

- FR27: Only authenticated users can access the system
- FR28: Unauthorized access attempts are blocked
- FR29: User sessions are managed securely

## Non-Functional Requirements

### Performance

- Temps de traitement fichier CSV maximal: 5 minutes
- Système doit montrer progress pendant le traitement

### Security

- Mots de passe chiffrés (hashing)
- Données utilisateurs chiffrées au repos
- Accès uniquement après authentification
- Sessions sécurisées avec timeout

### Scalability

- Supporte 7-10 managers + 2 RH utilisateurs simultanés