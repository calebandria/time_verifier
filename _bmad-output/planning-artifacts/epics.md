---
stepsCompleted:
  - step-01-validate-prerequisites
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# time_verifier - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for time_verifier, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can authenticate with email/password
FR2: System can validate user credentials against stored hashes
FR3: System can assign role-based permissions (RH or Manager)
FR4: RH users can view all activities and employees
FR5: Manager users can view only assigned activities and team members
FR6: RH users can upload CSV Hikvision files
FR7: RH users can upload XLSX employee lists per activity
FR8: Manager users can upload XLSX planning files
FR9: Users can download XLSX template for planning input
FR10: System can validate file format and structure
FR11: System can display errors for invalid templates or unknown employees
FR12: System can show progress/waiting state during processing
FR13: System can compare planning data against Hikvision records
FR14: System can calculate number of delays for each employee
FR15: System can calculate number of absences for each employee
FR16: System can identify employees with leave modifications
FR17: System can exclude validated leaves from absence count
FR18: System can exclude pre-notified delays from delay count
FR19: System can enforce modification deadline (before day 19)
FR20: RH users can view dashboard with delay counts
FR21: RH users can view dashboard with absence counts
FR22: Dashboard can show current period data
FR23: System can display processing errors clearly
FR24: System can log all modifications with user, timestamp, old/new values
FR25: Users can view modification history
FR26: System can restore previous planning versions
FR27: Only authenticated users can access the system
FR28: Unauthorized access attempts are blocked
FR29: User sessions are managed securely

### NonFunctional Requirements

NFR1: CSV processing time must be at most 5 minutes
NFR2: System must show progress during processing
NFR3: Passwords must be hashed
NFR4: User data must be encrypted at rest
NFR5: Access is allowed only after authentication
NFR6: Sessions are secure and have a timeout
NFR7: Support 7-10 managers and 2 RH simultaneously

### Additional Requirements

- Use the existing MERN + TypeScript starter already present in the repo (React + Vite client, Express + TypeScript server, MongoDB/Mongoose).
- Frontend stack: React 19 + Vite 8 + TypeScript.
- Backend stack: Express 5 + TypeScript; MongoDB via Mongoose.
- Authentication: JWT (stateless) stored in HTTP-only cookies.
- Password hashing: bcrypt.
- API security baseline: Helmet + rate limiting.
- API routing convention: prefix `/api/v1/` and plural resources.
- API response format: success `{ data: {...}, meta?: {...} }` and error `{ error: { code: string, message: string } }`.
- Date/time format: ISO 8601 strings in API payloads.
- File upload handling: Multer to server-local storage (uploads/).
- Project structure boundaries:
  - Client: `client/src/{features,components,pages,hooks,services,context,types,utils}/`
  - Server: `server/src/{routes,models,middleware,services,controllers,utils,config}/`

### UX Design Requirements

N/A (no UX design document provided)

### FR Coverage Map

{{requirements_coverage_map}}

## Epic List

{{epics_list}}

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}

{{epic_goal_N}}

<!-- Repeat for each story (M = 1, 2, 3...) within epic N -->

### Story {{N}}.{{M}}: {{story_title_N_M}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

<!-- End story repeat -->
