# CareFlow — User Acceptance Testing (UAT) Document

**Application:** CareFlow AI-Powered Care Home Management Platform  
**Version:** 1.0  
**Environment:** Production / Staging  
**URL:** `http://localhost:3000`  
**Date:** _______________  
**Tester Name:** _______________  
**Tester Role:** _______________

---

## Test Credentials

| Portal | Email | Password | Role |
|--------|-------|----------|------|
| Staff | `manager@sunrise.demo` | `Password123!` | Manager |
| Staff | `senior@sunrise.demo` | `Password123!` | Senior Carer |
| Staff | `carer@sunrise.demo` | `Password123!` | Care Staff |
| Family | *(Invite via Family Management)* | *(Set during registration)* | Family Member |
| Professional | *(Grant via Professional Access)* | *(Set during registration)* | GP / Healthcare Professional |

---

## Test Result Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Pass** — Feature works as expected |
| ❌ | **Fail** — Feature does not work as expected |
| ⚠️ | **Partial** — Works with minor issues (document in Notes) |
| ⏭️ | **Skipped** — Not tested (state reason) |
| N/A | **Not Applicable** — Does not apply to this environment |

---

## Table of Contents

1. [UI/UX & Design System](#1-uiux--design-system)
2. [Authentication & Access Control](#2-authentication--access-control)
3. [Dashboard](#3-dashboard)
4. [Resident Management](#4-resident-management)
5. [Pre-Admission Pipeline](#5-pre-admission-pipeline)
6. [Assessments](#6-assessments)
7. [Care Plans](#7-care-plans)
8. [Daily Care Notes](#8-daily-care-notes)
9. [Handover Reports](#9-handover-reports)
10. [Incident Reporting](#10-incident-reporting)
11. [Body Map](#11-body-map)
12. [Voice Input](#12-voice-input)
13. [eMAR (Medication Administration)](#13-emar-medication-administration) — Weekly MAR grid, UK codes, PRN log, stock management
14. [GP Communications](#14-gp-communications)
15. [Pharmacy](#15-pharmacy)
16. [Risk Analytics](#16-risk-analytics)
17. [Pattern Alerts](#17-pattern-alerts)
18. [Family Portal](#18-family-portal)
19. [Inspection Readiness](#19-inspection-readiness)
20. [Compliance Dashboard](#20-compliance-dashboard)
21. [Audit Logs](#21-audit-logs)
22. [Staff Management](#22-staff-management)
23. [Rota / Shift Scheduling](#23-rota--shift-scheduling)
24. [Multi-Site Dashboard](#24-multi-site-dashboard)
25. [Professional Access Portal](#25-professional-access-portal)
26. [Mobile & Responsive Design](#26-mobile--responsive-design)
27. [Performance & Reliability](#27-performance--reliability)

---

## 1. UI/UX & Design System

**Route:** All pages  
**Purpose:** Verify the premium dark theme, glassmorphism effects, typography, animations, and overall visual consistency across the application.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1 | Dark theme applied globally | Navigate to any page | Dark background (`#0a0f1a` range), light text, no white/light-mode remnants | ☐ | |
| 1.2 | Plus Jakarta Sans font | Inspect any text element | Font family is "Plus Jakarta Sans", not Inter or Arial | ☐ | |
| 1.3 | Glassmorphism effects | View sidebar, header, cards | Semi-transparent backgrounds with backdrop blur, subtle borders (`rgba(255,255,255,0.06)`) | ☐ | |
| 1.4 | Stat card colour themes | View Dashboard | 4 stat cards with distinct gradient accents: cyan, violet, amber, rose | ☐ | |
| 1.5 | Hover animations | Hover over stat cards, nav items, buttons | Smooth transitions: `translateY(-2px)` on cards, colour transitions on nav items | ☐ | |
| 1.6 | Active sidebar indicator | Click sidebar nav items | Active item shows cyan highlight with left gradient pill indicator | ☐ | |
| 1.7 | Gradient orbs (background) | View Dashboard | Subtle animated gradient orbs floating in background (cyan, violet, rose) | ☐ | |
| 1.8 | Badge dark variants | View any page with badges | Badges use dark-themed colours (e.g., `bg-emerald-500/15 text-emerald-400`) with no light-mode backgrounds | ☐ | |
| 1.9 | Button styling | View quick actions on dashboard | Primary CTA has cyan-teal gradient, outlined buttons have glass effect | ☐ | |
| 1.10 | Header glassmorphism | View top header bar | Glass effect with backdrop blur, gradient avatar, subtle border | ☐ | |
| 1.11 | Typography hierarchy | View any page | Clear font weight hierarchy — extrabold headings, medium labels, regular body | ☐ | |
| 1.12 | Print styles preserved | Print Dashboard page (Ctrl+P / Cmd+P) | Clean layout without gradient orbs, dark backgrounds, or blur effects | ☐ | |

---

## 2. Authentication & Access Control

**Routes:** `/(auth)/login`, `/(auth)/register`  
**Purpose:** Verify login, registration, role-based access, and session management.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1 | Staff login | Go to `/login`, enter valid credentials | Redirects to `/dashboard` | ☐ | |
| 2.2 | Invalid credentials | Enter wrong email/password | Error message displayed, no redirect | ☐ | |
| 2.3 | Organisation registration | Go to `/register`, fill org + admin details | New org + user created, redirected to dashboard | ☐ | |
| 2.4 | Role-based sidebar | Login as Manager vs Care Staff | Manager sees Compliance, Audit Logs; Care Staff has restricted nav | ☐ | |
| 2.5 | Session persistence | Login, close tab, reopen app | Session maintained — dashboard loads without re-login | ☐ | |
| 2.6 | Logout | Click user menu → sign out | Session cleared, redirected to login | ☐ | |
| 2.7 | Multi-tenant isolation | Login with different org user | Only see data for own organisation | ☐ | |
| 2.8 | Protected routes | Access `/dashboard` without login | Redirects to `/login` | ☐ | |

---

## 3. Dashboard

**Route:** `/(dashboard)/dashboard`  
**Purpose:** Verify the main dashboard displays accurate metrics, recent activity, and interactive elements.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1 | Dashboard loads | Navigate to `/dashboard` | Page renders with greeting, stats, quick actions, recent activity | ☐ | |
| 3.2 | Greeting message | Check greeting text | Correct time-of-day greeting (morning/afternoon/evening) + user first name in cyan gradient | ☐ | |
| 3.3 | Current Residents count | Compare stat card value with `/residents?status=ADMITTED` | Count matches | ☐ | |
| 3.4 | Enquiries count | Compare stat card value with `/residents?status=ENQUIRY` | Count matches | ☐ | |
| 3.5 | Pre-Assessed count | Compare stat card value with `/residents?status=PRE_ASSESSED` | Count matches | ☐ | |
| 3.6 | Open Incidents count | Compare stat card value with `/incidents?status=OPEN` | Count matches | ☐ | |
| 3.7 | Stat card navigation | Click each stat card | Navigates to corresponding filtered page | ☐ | |
| 3.8 | Alert banner | Create overdue assessment or pending care plan | Yellow/amber alert banner appears at top of dashboard | ☐ | |
| 3.9 | Quick actions | Click "Add Resident" | Navigates to `/residents/new` | ☐ | |
| 3.10 | Recent Incidents | View bottom-left panel | Shows latest incidents with severity badges and relative timestamps | ☐ | |
| 3.11 | Recent Care Notes | View bottom-right panel | Shows latest care notes with shift badges and content preview | ☐ | |
| 3.12 | "View all" links | Click "View all" on incidents/care notes | Navigate to full listing pages | ☐ | |

---

## 4. Resident Management

**Routes:** `/(dashboard)/residents`, `/(dashboard)/residents/new`, `/(dashboard)/residents/[id]`  
**Purpose:** Verify CRUD operations, search, filtering, and profile management.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1 | Resident list loads | Navigate to `/residents` | List of all residents with search bar and status filter | ☐ | |
| 4.2 | Search by name | Type resident name in search | List filters in real-time | ☐ | |
| 4.3 | Filter by status | Select "ADMITTED" from filter dropdown | Only ADMITTED residents shown | ☐ | |
| 4.4 | Create new resident | Click "Add Resident", fill required fields, submit | New resident created, redirected to profile | ☐ | |
| 4.5 | Resident profile view | Click on a resident | Profile page shows all tabs: Overview, Assessments, Care Plans, etc. | ☐ | |
| 4.6 | Edit resident details | Edit NHS number or other field on profile | Changes saved and reflected | ☐ | |
| 4.7 | Status transitions | Change resident status (e.g., ENQUIRY → PRE_ASSESSED) | Status updates, appears in correct filter category | ☐ | |
| 4.8 | Soft delete only | Attempt to delete resident | Resident is soft-deleted (not permanently removed), no longer in active list | ☐ | |

---

## 5. Pre-Admission Pipeline

**Route:** `/(dashboard)/pipeline`  
**Purpose:** Verify the prospect funnel visualisation and status management.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.1 | Pipeline view loads | Navigate to `/pipeline` | Funnel view showing ENQUIRY → PRE_ASSESSED → ADMITTED columns | ☐ | |
| 5.2 | Resident cards in pipeline | Check pipeline columns | Residents appear in correct status column | ☐ | |
| 5.3 | Move through pipeline | Change a resident's status | Resident moves to new column without page reload | ☐ | |
| 5.4 | Click to profile | Click a resident card in pipeline | Navigate to that resident's profile page | ☐ | |

---

## 6. Assessments

**Routes:** `/(dashboard)/residents/[id]/assessments`, `/(dashboard)/residents/[id]/assessments/new`, `/(dashboard)/residents/[id]/assessments/pre-admission`, `/(dashboard)/residents/[id]/assessments/new/[type]`, `/(dashboard)/residents/[id]/assessments/[assessmentId]`  
**Purpose:** Verify pre-admission assessments, formal assessments with scoring tools, versioning, and review cycles.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1 | Assessment list | Navigate to resident → Assessments tab | List of all assessments with dates and types | ☐ | |
| 6.2 | Pre-admission assessment | Click "New Assessment" → Pre-Admission | 5-domain form: personal, medical/social, care needs, communication, preferences | ☐ | |
| 6.3 | Pre-admission form submit | Complete and submit pre-admission form | Assessment saved, appears in list | ☐ | |
| 6.4 | Formal assessment (Waterlow) | Create formal assessment | Waterlow pressure ulcer scoring tool appears, calculates risk level | ☐ | |
| 6.5 | Formal assessment (MORSE) | Create formal assessment | MORSE fall risk scoring tool appears, calculates risk level | ☐ | |
| 6.6 | Formal assessment (MUST) | Create formal assessment | MUST nutritional screening appears, calculates risk level | ☐ | |
| 6.7 | Assessment versioning | Edit a completed assessment | New version created, previous version preserved in history | ☐ | |
| 6.8 | Version history | View assessment detail → version history | All previous versions listed with timestamps | ☐ | |
| 6.9 | Monthly review due | Check assessment older than 30 days | "Due for review" indicator appears | ☐ | |

---

## 7. Care Plans

**Routes:** `/(dashboard)/residents/[id]/care-plans`, `/(dashboard)/residents/[id]/care-plans/new`, `/(dashboard)/residents/[id]/care-plans/[cpId]`  
**Purpose:** Verify AI-powered care plan generation, approval workflow, and progress notes.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1 | Care plan list | Navigate to resident → Care Plans tab | List of all care plans with status (DRAFT/ACTIVE) | ☐ | |
| 7.2 | AI care plan generation | Click "Create Care Plan" → select category | AI generates care plan content based on assessments, editable before save | ☐ | |
| 7.3 | 15 categories available | View category selection | All 15 care plan categories listed | ☐ | |
| 7.4 | Manual care plan | Create care plan without AI | Blank form allows manual completion | ☐ | |
| 7.5 | Draft → Active approval | Submit care plan as draft | Appears as DRAFT; Manager can approve to ACTIVE | ☐ | |
| 7.6 | Care plan versioning | Edit an active care plan | New version created, previous preserved | ☐ | |
| 7.7 | Progress notes | Open an active care plan → add progress note | Note saved with timestamp and author | ☐ | |

---

## 8. Daily Care Notes

**Routes:** `/(dashboard)/care-notes`, `/(dashboard)/care-notes/new`, `/(dashboard)/residents/[id]/care-notes/new`  
**Purpose:** Verify care note entry, search, filtering, and AI shift summaries.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1 | Care notes listing | Navigate to `/care-notes` | Org-wide list of care notes with search and filters | ☐ | |
| 8.2 | Quick-entry form | Click "New Care Note" | Form loads with resident selection, shift, category, content | ☐ | |
| 8.3 | Resident-specific entry | Navigate to resident → "New Care Note" | Form pre-filled with resident, content field ready | ☐ | |
| 8.4 | Category selection | Create note with category (e.g., Personal Care) | Category saved and filterable | ☐ | |
| 8.5 | Search care notes | Use search bar to find notes by content keyword | Matching notes returned | ☐ | |
| 8.6 | Filter by shift | Filter by MORNING/AFTERNOON/NIGHT | Only notes from selected shift shown | ☐ | |
| 8.7 | AI shift summary | Generate shift summary | AI produces coherent summary of all shift notes | ☐ | |

---

## 9. Handover Reports

**Route:** `/(dashboard)/handover`  
**Purpose:** Verify AI-generated handover reports, manual additions, and print functionality.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1 | Handover page loads | Navigate to `/handover` | Options to generate new handover or view history | ☐ | |
| 9.2 | AI handover generation | Click "Generate Handover" | AI generates structured handover report from recent shift notes | ☐ | |
| 9.3 | Manual additions | Add a manual note to generated handover | Note added and saved alongside AI content | ☐ | |
| 9.4 | Print handover | Click print button | Print-friendly layout opens in print dialog | ☐ | |
| 9.5 | Handover history | View previous handovers | List of past handovers with dates | ☐ | |

---

## 10. Incident Reporting

**Routes:** `/(dashboard)/incidents`, `/(dashboard)/incidents/new`, `/(dashboard)/incidents/[id]`  
**Purpose:** Verify incident reporting, severity tracking, follow-up notes, and PDF export.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.1 | Incident list | Navigate to `/incidents` | List of all incidents with severity badges | ☐ | |
| 10.2 | Report new incident | Click "Report Incident", fill form | Incident created with type, severity, description | ☐ | |
| 10.3 | Severity-based display | Create LOW, MEDIUM, HIGH incidents | Each severity shows distinct colour badge | ☐ | |
| 10.4 | Incident detail | Click an incident | Detail page with full information | ☐ | |
| 10.5 | Follow-up notes | Add a follow-up to an existing incident | Note added with timestamp, immutable (cannot edit/delete) | ☐ | |
| 10.6 | Incident filtering | Filter by severity and/or type | Correct results shown | ☐ | |
| 10.7 | PDF export | Click "Export PDF" on incident detail | PDF downloaded with complete incident report | ☐ | |
| 10.8 | Status management | Change incident status (OPEN → CLOSED) | Status updates, reflected in list | ☐ | |

---

## 11. Body Map

**Route:** `/(dashboard)/residents/[id]/body-map`  
**Purpose:** Verify interactive SVG body map, injury tracking, photo upload, and history.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.1 | Body map view | Navigate to resident → Body Map tab | SVG body diagram displayed with existing markers | ☐ | |
| 11.2 | Add new marker | Click on body region | Form appears to log injury/skin condition with severity | ☐ | |
| 11.3 | Severity colour coding | Add markers with different severities | Different colours for LOW/MEDIUM/HIGH severity | ☐ | |
| 11.4 | Photo upload | Attach photo to body map entry | Photo uploaded and visible in entry detail | ☐ | |
| 11.5 | History timeline | View body map history | Chronological list of all entries with dates | ☐ | |
| 11.6 | Resolution tracking | Mark an entry as resolved | Entry shows resolved status with date | ☐ | |

---

## 12. Voice Input

**Purpose:** Verify audio recording, Whisper transcription, AI structuring, and multi-category detection.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.1 | Microphone button | Open care note form | Floating mic button or voice input option visible | ☐ | |
| 12.2 | Audio recording | Press and hold mic button, speak | Waveform visualisation + recording indicator | ☐ | |
| 12.3 | Transcription | Release mic after speaking | Speech converted to text (Whisper API) | ☐ | |
| 12.4 | AI structuring | Speak a multi-topic note | AI categorises and structures the spoken content | ☐ | |
| 12.5 | Multi-category detection | Speak about multiple care topics at once | System splits into separate structured records, one per category | ☐ | |
| 12.6 | Review before submit | Complete voice input | Staff can review, edit, and confirm structured output before saving | ☐ | |
| 12.7 | Web Speech API fallback | Disable internet / lower bandwidth | Falls back to browser Web Speech API | ☐ | |

---

## 13. eMAR (Medication Administration)

**Routes:** `/(dashboard)/emar`, `/(dashboard)/emar/[residentId]`, `/(dashboard)/medications/[residentId]`, `/(dashboard)/emar/[residentId]/prn-protocols`  
**Purpose:** Verify weekly MAR grid, UK MAR codes, multi-slot administration, PRN workflows, stock management, and controlled drug register.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 13.1 | eMAR overview | Navigate to `/emar` | Org-wide view listing all residents with active medication counts, low-stock/CD alerts | ☐ | |
| 13.2 | Resident MAR header | Click a resident → eMAR page | Header shows "Medication Administration Record (MAR)", resident name, DOB | ☐ | |
| 13.3 | Weekly MAR grid | View MAR Chart tab | 7-day grid, each day column shows day (EEE) + date (d/M), today column highlighted blue | ☐ | |
| 13.4 | MAR code legend | View MAR grid | Always-visible horizontal legend bar showing all UK codes: G=Given, R=Refused, S=Sleeping, etc. | ☐ | |
| 13.5 | Week navigation | Click "Previous Week" / "Next Week" / "Today" buttons | Grid shifts week correctly; "Today" button returns to current week | ☐ | |
| 13.6 | Multi-slot medications | Add a TDS (3×/day) medication | Three rows rendered for that medication — Morning, Lunchtime, Evening — medication name spans all rows with rowspan | ☐ | |
| 13.7 | Administer given (G) | Click any cell today → select G → click Record | Cell turns green, shows carer's initials (e.g. "JD") instead of time | ☐ | |
| 13.8 | Administer all slots | For TDS medication, administer all 3 slots | Each row's cell turns green independently; second and third slots must also record correctly | ☐ | |
| 13.9 | Record refusal (R) | Click cell → select R → add reason → Record | Cell turns red with "R" + carer initials; reason saved | ☐ | |
| 13.10 | Record other codes | Test S, P, M, H, D, N, L, Q, O codes | Correct colour/label per UK MAR code legend | ☐ | |
| 13.11 | Past unadministered cells | View cells from previous days with no record | Cells show amber background with "-" | ☐ | |
| 13.12 | Future cells | View cells for future dates | Cells show light green, disabled (cannot click) | ☐ | |
| 13.13 | Stock column | View MAR grid | Rightmost "Stock" column shows current stock count per medication | ☐ | |
| 13.14 | Stock decrements on administration | Administer a medication (G) | Stock count in grid AND medications page both decrease by 1 | ☐ | |
| 13.15 | PRN administration | Click PRN cell → record reason + pain scores before/after → G | Recorded; PRN Administration Log section below grid shows new row | ☐ | |
| 13.16 | PRN log columns | View PRN Administration Log | Shows Date, Time, Medication, Dose, Reason, Effectiveness (pain before→after), Given By | ☐ | |
| 13.17 | PRN protocols page | Click "PRN Protocols" button (if PRN meds exist) | Lists all PRN meds with indication, minimum interval, and protocol notes | ☐ | |
| 13.18 | Carer's Notes section | View bottom of MAR grid | Carer's Notes table with Date, Time, Notes, Signature columns (3 blank rows for manual entries) | ☐ | |
| 13.19 | Add medication | Click "+ Add Medication" in UK Stock tab | Medication form with name search (UK autocomplete), dose, route, frequency, stock fields | ☐ | |
| 13.20 | UK medicine autocomplete | Type first 3 letters of a UK drug name in search | Dropdown shows matching UK medicines from reference list | ☐ | |
| 13.21 | Medications page | Click "Medications" button on eMAR header | Opens `/medications/[residentId]` with 4 stat cards and tab interface | ☐ | |
| 13.22 | UK Stock tab | View UK Stock tab on medications page | Table: Medication (name + dose + CD badge) \| Status \| Quantity \| Batch \| Expiry \| Actions menu | ☐ | |
| 13.23 | Prescriptions tab | Click Prescriptions tab | Active prescriptions with frequency, prescribed by, start date | ☐ | |
| 13.24 | Alerts tab | Click Alerts tab | Low stock alert panel (amber) and expiring-soon panel (red); shows "No alerts" if all clear | ☐ | |
| 13.25 | Controlled Drugs tab | Click Controlled Drugs tab | CD-only medications with CD2 badge | ☐ | |
| 13.26 | Receive Stock dialog | Click ⋮ → Receive Stock on any medication | Dialog shows current stock, quantity input, calculated new total; saves correctly | ☐ | |
| 13.27 | Controlled drug witness | Administer a CD medication (G) | Requires witness selection; creates entry in CD Register with "before" and "after" balance | ☐ | |
| 13.28 | Missed dose alerts | Leave a scheduled medication unadministered past time | System shows missed dose alert/notification | ☐ | |
| 13.29 | Monthly audit report | Navigate to Audit tab → Generate | Auto-generated stats with administered/refused/omitted counts | ☐ | |

---

## 14. GP Communications

**Route:** `/(dashboard)/gp-communications`  
**Purpose:** Verify AI-assisted GP letter drafting, approval workflow, and communication log.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 14.1 | Communication list | Navigate to `/gp-communications` | List of all GP communications with status | ☐ | |
| 14.2 | AI prescription request | Create new GP communication → Prescription Request | AI generates clinical-language draft based on medication data | ☐ | |
| 14.3 | AI clinical concern | Create new → Clinical Concern | AI generates structured clinical concern letter | ☐ | |
| 14.4 | Approval workflow | Submit draft GP letter | Appears as "Pending Approval" for manager review | ☐ | |
| 14.5 | Manager approval | Login as Manager, approve pending letter | Letter status changes to "Approved" / ready to send | ☐ | |
| 14.6 | Communication log | View per-resident communication history | Full history of all GP correspondence | ☐ | |
| 14.7 | Follow-up tracking | Set follow-up date on communication | Due date alert appears when overdue | ☐ | |

---

## 15. Pharmacy

**Route:** `/(dashboard)/pharmacy`  
**Purpose:** Verify pharmacy profile management, order generation, and stock alerts.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 15.1 | Pharmacy page loads | Navigate to `/pharmacy` | Pharmacy listing with profiles, orders, and alerts | ☐ | |
| 15.2 | Add pharmacy profile | Create new pharmacy with contact details | Pharmacy saved and appears in list | ☐ | |
| 15.3 | Monthly order generation | Trigger monthly order from active medications | Order auto-generated with all active meds | ☐ | |
| 15.4 | Order status tracking | Track order through: Submitted → Confirmed → Dispensed | Status updates correctly at each stage | ☐ | |
| 15.5 | Stock alerts | View stock levels | Low stock and out-of-stock alerts displayed | ☐ | |

---

## 16. Risk Analytics

**Routes:** `/(dashboard)/risk-analytics`, `/(dashboard)/risk-analytics/[residentId]`  
**Purpose:** Verify 4-domain risk scoring, AI recommendations, org-wide dashboard, and manual calculation trigger.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 16.1 | Risk analytics dashboard | Navigate to `/risk-analytics` | Org-wide table of all residents sorted by combined risk score; "No profiles yet" message if none calculated | ☐ | |
| 16.2 | Calculate Risk Scores button | Click "Calculate Risk Scores" button | Spinner shows; all admitted residents calculated; summary shows "X residents calculated" | ☐ | |
| 16.3 | Risk table displays | After calculation | Table shows resident name, Overall score, Falls, Pressure, Medication, Safeguarding, Last Updated | ☐ | |
| 16.4 | HIGH risk alert banner | If any resident is HIGH or VERY HIGH | Red alert banner appears top-right showing count | ☐ | |
| 16.5 | Individual risk detail | Click a resident row | Navigates to `/risk-analytics/[residentId]` — 4 score cards with colour-coded levels | ☐ | |
| 16.6 | Risk score thresholds | Verify band labels | 0–33 = LOW (green), 34–66 = MEDIUM (amber), 67–100 = HIGH (orange), 85+ = VERY HIGH (red) | ☐ | |
| 16.7 | Risk factors list | View individual risk detail | Lists each contributing factor with domain label and weight | ☐ | |
| 16.8 | AI recommendations | View recommendations section | 3–5 plain-language, numbered recommendations; if OpenAI unavailable, shows rule-based summary instead | ☐ | |
| 16.9 | Acknowledge risk | Click "Acknowledge" on a risk domain | Dialog requires reason text; logged in audit trail | ☐ | |
| 16.10 | Quick actions | Use quick action buttons on risk detail | "Log Incident" / "Update Care Plan" buttons navigate to correct pre-filled forms | ☐ | |
| 16.11 | HIGH risk colour coding | View HIGH-risk resident row | Row/badges clearly use red/orange visual indicators | ☐ | |
| 16.12 | Risk recalculates on new data | Record a fall incident, then recalculate | Falls risk score increases | ☐ | |

---

## 17. Pattern Alerts

**Route:** `/(dashboard)/pattern-alerts`  
**Purpose:** Verify AI pattern detection, alert workflow, and trend visualisation.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 17.1 | Pattern alerts page | Navigate to `/pattern-alerts` | List of AI-detected patterns sorted by severity | ☐ | |
| 17.2 | Alert detail | Click on a pattern alert | Detailed view with evidence, data sources, and analysis | ☐ | |
| 17.3 | Acknowledge alert | Click "Acknowledge" on pattern | Alert status changes, records who acknowledged and when | ☐ | |
| 17.4 | Action workflow | Take action → link to care plan update | Creates follow-up action linked to the pattern | ☐ | |
| 17.5 | Dismiss with reason | Dismiss alert as false positive | Requires reason text, logged in audit trail | ☐ | |
| 17.6 | Trend charts | View trend visualisation | Charts showing falls over time, weight trends, etc. | ☐ | |

---

## 18. Family Portal

**Routes:** `/family/login`, `/family/accept-invite`, `/family/(portal)/dashboard`, `/family/(portal)/care-plans`, `/family/(portal)/messages`  
**Purpose:** Verify separate family authentication, data isolation, wellbeing updates, messaging, and read-only access.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 18.1 | Family invite (staff side) | Go to `/family-management` → Invite family member | Invitation email sent to specified email address | ☐ | |
| 18.2 | Accept invite | Open invitation email → click link | Arrives at `/family/accept-invite`, set password form | ☐ | |
| 18.3 | Family login | Login at `/family/login` | Redirects to family portal dashboard | ☐ | |
| 18.4 | Data isolation | View family portal | Only see data for linked resident, no access to other residents | ☐ | |
| 18.5 | Wellbeing updates | View family dashboard | Daily wellbeing summaries (mood, appetite, sleep, activity, photo, notes) | ☐ | |
| 18.6 | Read-only care plans | Navigate to Care Plans tab | Simplified, non-clinical language care plans (read-only) | ☐ | |
| 18.7 | Secure messaging - send | Compose and send a message | Message delivered to staff inbox | ☐ | |
| 18.8 | Secure messaging - receive | Staff replies to family message | Reply visible in family message inbox | ☐ | |
| 18.9 | Incident notifications | Create MEDIUM+ severity incident for linked resident | Family receives incident notification | ☐ | |
| 18.10 | Cannot access staff portal | Try navigating to `/dashboard` from family login | Access denied / redirected to family portal | ☐ | |

---

## 19. Inspection Readiness

**Route:** `/(dashboard)/inspection`  
**Purpose:** Verify CQC/Care Inspectorate KLOE mapping, evidence tracking, gap analysis, and mock inspection reports.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 19.1 | Inspection page loads | Navigate to `/inspection` | KLOE standards view with RAG status per standard | ☐ | |
| 19.2 | CQC framework | View CQC standards | 5 domains: Safe, Effective, Caring, Responsive, Well-Led | ☐ | |
| 19.3 | Care Inspectorate switch | Switch regulatory framework setting | Scotland-specific quality framework displayed | ☐ | |
| 19.4 | Auto-evidence mapping | View evidence for a standard | CareFlow data (assessments, notes, etc.) auto-mapped to KLOE standards | ☐ | |
| 19.5 | Evidence click-through | Click evidence item | Navigates to source record (assessment, care plan, etc.) | ☐ | |
| 19.6 | Gap identification | View standards with no evidence | "No evidence found" warning with action suggestions | ☐ | |
| 19.7 | RAG compliance view | View overall compliance | Red/Amber/Green status clearly visible per standard | ☐ | |
| 19.8 | Mock inspection report | Generate mock report | AI-generated structured report in CQC/CI format | ☐ | |
| 19.9 | Report history | View previous mock reports | List of past reports with improvement trend tracking | ☐ | |

---

## 20. Compliance Dashboard

**Route:** `/(dashboard)/compliance`  
**Purpose:** Verify RAG status dashboard, overdue alerts, and key compliance metrics (Manager only).

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 20.1 | Compliance dashboard loads | Navigate to `/compliance` (as Manager) | RAG status view with key compliance metrics | ☐ | |
| 20.2 | Manager-only access | Login as Care Staff → navigate to `/compliance` | Access denied or restricted view | ☐ | |
| 20.3 | Overdue review alerts | Check for overdue assessments | Overdue indicators highlighted in red | ☐ | |
| 20.4 | Per-resident RAG | View individual resident compliance | RAG status per resident based on assessment/care plan currency | ☐ | |
| 20.5 | Incident tracking metrics | View incident summary | Total count, severity breakdown, trends | ☐ | |

---

## 21. Audit Logs

**Route:** `/(dashboard)/audit-logs`  
**Purpose:** Verify all CRUD operations are logged with user, timestamp, and action detail.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 21.1 | Audit logs page loads | Navigate to `/audit-logs` (as Manager) | List of all audit entries | ☐ | |
| 21.2 | Manager-only access | Login as Care Staff → navigate to `/audit-logs` | Access denied or restricted | ☐ | |
| 21.3 | Create action logged | Create a new resident | Audit log entry shows CREATE with user + timestamp | ☐ | |
| 21.4 | Update action logged | Edit a resident's details | Audit log entry shows UPDATE with user + timestamp | ☐ | |
| 21.5 | Filter audit logs | Filter by action type or date range | Correct results returned | ☐ | |
| 21.6 | Immutable entries | Verify audit entries cannot be edited or deleted | No edit/delete options on audit entries | ☐ | |

---

## 22. Staff Management

**Routes:** `/(dashboard)/staff`, `/(dashboard)/staff/[id]`  
**Purpose:** Verify staff profiles, training matrix, qualifications, and supervision logs.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 22.1 | Staff list | Navigate to `/staff` | List of all staff with roles and search | ☐ | |
| 22.2 | Add staff member | Create new staff profile | Profile created with qualifications and contact details | ☐ | |
| 22.3 | Staff profile detail | Click on a staff member | Full profile with training records, supervision, and qualifications | ☐ | |
| 22.4 | Training matrix | View mandatory training section | 12 standard training categories listed | ☐ | |
| 22.5 | Training record | Add training completion record | Record saved with date, expiry, and certificate upload option | ☐ | |
| 22.6 | Training expiry alerts | View training nearing expiry | 30-day advance warning indicator | ☐ | |
| 22.7 | Certificate upload | Upload a PDF/image certificate | File uploaded and attached to training record | ☐ | |
| 22.8 | Org compliance percentage | View training compliance metric | Percentage of staff with up-to-date mandatory training | ☐ | |
| 22.9 | Supervision log | Add supervision record | Saved with date, notes, and next due date | ☐ | |
| 22.10 | Overdue supervision | View staff with overdue supervision | Overdue indicator displayed | ☐ | |

---

## 23. Rota / Shift Scheduling

**Route:** `/(dashboard)/staff/rota`  
**Purpose:** Verify rota calendar, shift assignment, conflict detection, and coverage view.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 23.1 | Rota calendar loads | Navigate to `/staff/rota` | Weekly/monthly calendar grid view | ☐ | |
| 23.2 | Assign shift | Click cell → assign staff member to shift | Shift assigned and displayed in calendar | ☐ | |
| 23.3 | Conflict detection | Assign same staff to overlapping shifts | Warning/error about scheduling conflict | ☐ | |
| 23.4 | Coverage view | View minimum staffing indicators | Shows green/red if minimum levels met per shift | ☐ | |
| 23.5 | Week vs month view | Toggle between weekly and monthly views | Calendar updates to show correct time period | ☐ | |

---

## 24. Multi-Site Dashboard

**Route:** `/(dashboard)/group`  
**Purpose:** Verify group management, cross-site comparison, and drill-down navigation.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 24.1 | Group dashboard loads | Navigate to `/group` | Aggregated overview with site cards | ☐ | |
| 24.2 | Site cards | View individual site cards | RAG status + key counts (residents, incidents, compliance) per site | ☐ | |
| 24.3 | Cross-site comparison | View comparison section | Side-by-side metrics: compliance, incidents, risk scores, staffing | ☐ | |
| 24.4 | Drill-down | Click a site card | Navigate to that site's individual dashboard | ☐ | |
| 24.5 | Group monthly report | Generate board-ready summary | Aggregated report across all sites with risk analytics comparison | ☐ | |

---

## 25. Professional Access Portal

**Routes:** `/professional/login`, `/professional/dashboard`, `/professional/resident/[id]`, `/(dashboard)/professional-access`  
**Purpose:** Verify GP/healthcare professional separate auth, time-limited access, and read-only views.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 25.1 | Grant access (staff side) | Go to `/professional-access` → Grant access to GP | Access granted for specific resident with expiry time | ☐ | |
| 25.2 | Time-limited access | Set 24-hour access period | Access automatically blocked after expiry | ☐ | |
| 25.3 | Professional login | Login at `/professional/login` | Redirects to professional dashboard | ☐ | |
| 25.4 | Accessible residents list | View professional dashboard | Only shows residents with active access grants | ☐ | |
| 25.5 | Read-only resident profile | Click a resident | Profile visible: assessments, care plans, notes, medications, body map, risk | ☐ | |
| 25.6 | No edit capabilities | Try to edit any data | No edit buttons/forms available (read-only) | ☐ | |
| 25.7 | AI GP visit summary | View summary section | Last 7-day summary: "What I need to know right now?" | ☐ | |
| 25.8 | Activity logging | Navigate around professional portal | All page views logged in AuditLog | ☐ | |
| 25.9 | Expired access blocked | Access after expiry time | Access denied, redirected with "access expired" message | ☐ | |
| 25.10 | Revoke access | Staff revokes GP access before expiry | GP immediately loses access to that resident | ☐ | |
| 25.11 | Cannot access staff portal | Try to navigate to `/dashboard` | Access denied / redirected | ☐ | |

---

## 26. Mobile & Responsive Design

**Purpose:** Verify all key workflows function correctly on mobile screen sizes.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 26.1 | Mobile bottom nav | View on mobile width (< 1024px) | Bottom navigation bar with glass effect and cyan active states | ☐ | |
| 26.2 | Desktop sidebar hidden on mobile | View on mobile width | Left sidebar hidden, replaced by bottom nav | ☐ | |
| 26.3 | Dashboard responsive | View Dashboard on iPhone SE (375px) | All stat cards stack in 2-column grid, content readable | ☐ | |
| 26.4 | Resident list responsive | View `/residents` on mobile | List adapts to mobile viewport, search still usable | ☐ | |
| 26.5 | Care note entry on mobile | Create care note on mobile device | Form usable with touch, submit works | ☐ | |
| 26.6 | Voice input on mobile | Tap mic button on mobile device | Audio recording works with proper UI feedback | ☐ | |
| 26.7 | MAR grid scrollable | View eMAR grid on mobile | Horizontally scrollable table with fixed medication column | ☐ | |
| 26.8 | Touch targets | Tap buttons and links on mobile | All interactive elements have adequate touch target size (44px minimum) | ☐ | |
| 26.9 | PWA install prompt | Open in Safari/Chrome on mobile | "Add to Home Screen" prompt or manifest detected | ☐ | |
| 26.10 | Offline care note | Enter care note while offline | Note queued locally, synced when connection restored | ☐ | |

---

## 27. Performance & Reliability

**Purpose:** Verify application performance, error handling, and data integrity.

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 27.1 | Page load time | Navigate to Dashboard | Page loads within 3 seconds | ☐ | |
| 27.2 | No console errors | Open browser DevTools console | No JavaScript errors on page load | ☐ | |
| 27.3 | Form validation | Submit empty required fields | Clear validation error messages displayed | ☐ | |
| 27.4 | Concurrent users | Two testers logged in simultaneously | Both sessions function independently without data conflicts | ☐ | |
| 27.5 | Data persistence | Create records, logout, login again | All previously created data persists | ☐ | |
| 27.6 | Error boundary | Trigger an error condition | Graceful error page displayed (not blank screen or stack trace) | ☐ | |
| 27.7 | API rate limiting | Submit forms rapidly | No duplicate records created; appropriate rate limiting response | ☐ | |
| 27.8 | Large data set | View resident list with 50+ records | Page loads without timeout, pagination/infinite scroll works | ☐ | |

---

## UAT Sign-Off

| Item | Detail |
|------|--------|
| **Total Test Cases** | 188 |
| **Passed** | _____ |
| **Failed** | _____ |
| **Partial** | _____ |
| **Skipped** | _____ |

### Summary of Defects Found

| # | Test Case ID | Description | Severity | Assigned To |
|---|-------------|-------------|----------|-------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Tester Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Project Lead | | | |
| Stakeholder | | | |

### Notes / Observations

_Use this section for general observations, suggestions, and improvement ideas noted during testing._

---

**Document End**
