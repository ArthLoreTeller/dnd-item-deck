# Player Inventory and Character Import Implementation Plan

**Execution update:** The user explicitly changed imports to PDF only. Omit D&D Beyond link adapters, endpoint middleware, and link-specific acceptance tests. Source PDF acceptance is verified against synthetic AcroForm/labeled-text fixtures; a genuine user export remains needed to verify its exact layout. Tasks 3–6 share one integration commit to keep page/dialog module dependencies coherent.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects delegation. Implement task by task and check off completed steps.

**Goal:** Deliver a dedicated illustrated inventory, 2024 D&D weight tracking, an editable player profile, and reviewed D&D Beyond link/PDF imports.

**Architecture:** Extend the existing persisted Zustand aggregate with profile and equipment fields, keeping operations atomic and legacy relic behavior intact. Hash-routed pages share the existing shell, theme, dialogs, dice, and menu. Pure data modules handle validation, migration, weight calculations, and import drafts; source adapters never directly mutate saved state.

**Tech Stack:** React 19, Zustand, Vite 8, Tailwind/CSS, lucide-react, Node test runner, Rolldown render tests; add `pdfjs-dist` for local PDF parsing. Use Node's fetch for a bounded same-origin link-import endpoint integrated into Vite development and preview.

**Spec:** [Approved design](../specs/2026-10-12-player-inventory-design.md)

## Global constraints

- Continue on `codex/version-1.2`; do not push or merge as part of this work.
- Preserve parchment cards, attunement animations, themes, recovery, and three-line navigation.
- Use 2024 D&D carrying capacity; do not apply 2014 variant encumbrance penalties.
- Unknown weights remain unknown. Currency is tracked separately and excluded from load with an explicit label.
- This release has one active profile, with a character ID on equipment records.
- Existing saves and version-one backups remain supported; old imports do not erase player information.
- Import parsing is a draft operation; only reviewed confirmation changes saved state.
- PDF parsing stays local. Do not use credentials, arbitrary fetch URLs, or access-control bypasses for link imports.
- Keep the Vite LAN preview available at port 5173. Document link-import endpoint hosting requirements for production.
- Source adapters require representative source samples for end-to-end verification; pages, profile, weight, and preview work do not depend on those samples.

## Review focus

1. Recovery/reset/draw must keep exactly one matching equipment record per owned relic (Task 2).
2. An unknown item weight must not silently become zero during migration or import (Tasks 1, 6).
3. Reimporting the same source character must not duplicate equipment or overwrite manual edits without selection (Task 6).
4. Malformed/private/changed upstream responses and PDF layouts must leave saved state untouched (Tasks 5, 6).
5. Browser history, short-screen menus, and modal focus must remain usable across the new routes (Tasks 3, 7).

## Files and contracts

- `src/data/player.js`: profile/equipment validation and legacy migration.
- `src/data/weight.js`: pure load and capacity calculations.
- `src/data/character-import.js`: canonical import drafts and reviewed merge results.
- `src/import/dndbeyond.js`: D&D Beyond response-to-draft normalization.
- `src/import/pdf.js`: local exported PDF-to-draft parsing.
- `server/character-import.js`: validated character-ID fetch and response normalization boundary.
- `src/navigation/routes.js`, `src/navigation/usePageRoute.js`: hash routes and legacy hash aliases.
- `src/pages/DeckPage.jsx`, `src/pages/InventoryPage.jsx`, `src/pages/CharacterPage.jsx`: focused page views.
- `src/components/EquipmentEditor.jsx`, `src/components/CharacterImportDialog.jsx`: editing and preview UI.
- Modify `src/App.jsx`, `src/components/CollectionNavigation.jsx`, `src/store/useCardStore.js`, `src/data/backup.js`, `src/index.css`, `vite.config.js`, `package.json`, lockfile, and `README.md` as their tasks require.
- New tests: `tests/player.test.js`, `tests/weight.test.js`, `tests/routes.test.js`, `tests/character-import.test.js`, `tests/import-endpoint.test.js`, `tests/backup-v2.test.js`; extend `tests/store.test.js` for relic/equipment invariants.

**Profile:** `{ id, rulesVersion: '2024', name, playerName, portraitUrl, species, background, classes: [{name,level}], abilities: {str,dex,con,int,wis,cha}, hp: {current,max,temp}, ac, speed, size, currency: {cp,sp,ep,gp,pp}, notes, capacityOverrideLb, capacityOverrideReason, source }`. Missing numeric values are `null`; validate finite values and field-specific ranges. Total class levels must not exceed 20, ability scores are 1–30, HP is nonnegative, and size belongs to the six defined creature sizes. Imported unsupported source values are flagged in the draft for correction.

**Equipment:** `{ id, characterId, name, quantity, unitWeightLb, carried, category, imageUrl, relicCardId, source }`. Quantity is an integer 1–999999; unit weight is `null` or finite and nonnegative; IDs and source identity are stable strings. Relic-linked entries have quantity one and derive name/artwork/attunement from the current card. Reject invalid edits rather than clamping user inputs into misleading totals.

**ImportDraft:** `{ profile, equipment, warnings, provenance }`. **ImportSelection:** `{ profileFields: string[], equipmentIds: string[], replaceSourceEquipment: boolean }`; apply only the selected fields/records, preserving unselected current values and unrelated relics.

## Task 1: Player records, migration, and weight calculations

**Files:** Create `src/data/player.js`, `src/data/weight.js`, `tests/player.test.js`, `tests/weight.test.js`.

**Interfaces:** `createPlayerProfile() -> Profile`; `validateProfile(value) -> Profile`; `validateEquipment(value) -> Equipment`; `migratePlayerData(savedState) -> {profile,equipment}`; `calculateLoad(profile,equipment) -> {knownWeightLb,unknownCount,capacityLb,dragLiftPushLb,remainingLb,status}`; `abilityModifier(score) -> number|null`.

- [ ] Write failing tests for STR 10 Small/Medium capacity 150 lb, Tiny 75 lb, Large 300 lb, Huge 600 lb, Gargantuan 1200 lb; push/lift/drag twice capacity; quantity three × 2 lb = 6 lb; stored items excluded; zero weight distinguished from unknown; exact limit allowed; unknown weights yield incomplete status; missing Strength/size yield unknown capacity; explicit override takes precedence.
- [ ] Add migration tests preserving owned card IDs and edits, creating one carried quantity-one unknown-weight equipment record per owned relic, and leaving existing valid profile/equipment unchanged. Include invalid and nonfinite quantities/weights, malformed profiles, and oversized strings.
- [ ] Run `node --test tests/player.test.js tests/weight.test.js`; confirm failures reflect missing behavior.
- [ ] Implement the interfaces and immutable migration. Capacity multipliers are 7.5/15/15/30/60/120 for Tiny/Small/Medium/Large/Huge/Gargantuan. Status is `within`, `over`, `incomplete`, or `capacity-unknown`; never issue a definitive within-capacity status for incomplete totals.
- [ ] Run new tests and `npm test`; commit passing changes with `feat: add player equipment and carrying capacity data`.

## Task 2: Atomic player/equipment persistence and relic lifecycle

**Files:** Modify `src/store/useCardStore.js`, `tests/store.test.js`; consume Task 1 modules.

**Interfaces:** Store exposes `profile`, `equipment`, `updateProfile(patch)`, `addEquipment(value)`, `updateEquipment(id,patch)`, `removeEquipment(id)`, and `applyCharacterImport(draft,selection)` once Task 6 provides its merge helper. Removal uses the existing recoverable/undo pattern for relics; ordinary equipment deletion has its own retained undo entry rather than misusing card IDs.

- [ ] Write failing lifecycle tests: draw creates one linked record, repeated selection creates none, discard removes carried relic equipment, undo/recovery restores its quantity/weight/carried edits, and reset retains custom relic equipment and ordinary player equipment while returning built-in cards to deck.
- [ ] Add reload tests for legacy saves, empty deck saves, player/equipment persistence, and duplicate/dangling relic links. Ensure missing weight remains null. Add ordinary equipment removal/undo coverage.
- [ ] Run `node --test tests/store.test.js`; confirm the new expectations fail before changing behavior.
- [ ] Add versioned persisted migration and focused validated update actions. Perform each lifecycle change with one `set` call. Keep three-item attunement and existing backup merge invariants intact.
- [ ] Run `npm test`; commit with `feat: persist player inventory with relic lifecycle migration`.

## Task 3: Dedicated routes and illustrated inventory

**Files:** Create navigation modules, `DeckPage.jsx`, `InventoryPage.jsx`, `EquipmentEditor.jsx`, and `tests/routes.test.js`; modify `src/App.jsx`, `src/components/CollectionNavigation.jsx`, `src/index.css`.

**Interfaces:** `resolvePageHash(hash) -> 'deck'|'inventory'|'character'` defaults to deck; `usePageRoute() -> {page,navigate}`; page components consume store selectors and callbacks for selected-item inspection. Equipment editor consumes an Equipment and commits through `updateEquipment`.

- [ ] Write failing route tests for new hashes, legacy aliases, unknown hashes, and route normalization. Run `node --test tests/routes.test.js`.
- [ ] Implement the route hook with `hashchange` subscription and cleanup. Add Character to the circular menu, convert Deck/Inventory from anchors within one page to route navigation, and preserve dice/sound/details behavior and focus restoration.
- [ ] Extract the existing deck view with minimal behavior changes. Replace its large inventory panel with a count/link. Build inventory artwork tiles, category fallbacks, search, name/rarity/weight sort, carried/attuned filters, selection, quantity/weight/carried editing, capacity summary, backup/recovery, and recoverable discard.
- [ ] Bound the expanded menu with available viewport height and scroll when necessary so adding Character does not hide actions on short screens. Ordinary equipment selection opens its editor; relic selection opens full card inspection with journal access.
- [ ] Verify browser back/forward, direct route reload, both legacy aliases, keyboard activation, and distinct deck/inventory views. Check 360 px mobile and desktop layouts, long names, missing artwork, and empty inventory; do not add tests that merely mirror CSS markup.
- [ ] Run `npm test` and `npm run build`; commit with `feat: add dedicated illustrated inventory navigation`.

## Task 4: Editable player profile page

**Files:** Create `src/pages/CharacterPage.jsx`; modify `src/index.css`, `src/App.jsx`, and focused player validation tests if new cases are found.

**Interfaces:** CharacterPage uses `profile`, `updateProfile`, `calculateLoad`, and `abilityModifier`; import launch is a callback filled by Task 6.

- [ ] Build labeled editable fields for the approved profile contract, derived modifiers, capacity and load summary, size selection, and explicit override/reason. Store only valid completed edits; retain local drafts for temporarily blank/invalid input and show useful validation.
- [ ] Keep HP, AC, and speed manual/imported values. Currency remains separate from load with the required note. Provide portrait fallback and editable portrait URL without embedding unbounded image blobs in storage.
- [ ] Verify edits survive refresh, Strength and size change capacity, unknown Strength prompts completion, and changing equipment does not silently change combat stats. Verify keyboard and mobile form usability.
- [ ] Run `npm test`, lint touched files, and `npm run build`; commit with `feat: add editable 2024 player profile`.

## Task 5: D&D Beyond and PDF source adapters

**Files:** Create `server/character-import.js`, `src/import/dndbeyond.js`, `src/import/pdf.js`, `tests/import-endpoint.test.js`, and source fixtures; modify Vite configuration and dependencies.

**Interfaces:** `parseCharacterLink(text) -> characterId`; `fetchCharacterById(id,{fetchImpl,timeoutMs}) -> sourcePayload`; `normalizeDndBeyond(payload) -> ImportDraft`; `parseCharacterPdf(arrayBuffer) -> Promise<ImportDraft>`; local `POST /api/character-import` accepts only `{characterId}` and returns a validated draft or a structured error.

- [ ] Obtain an accessible user-provided character link and exported PDF for acceptance fixtures; redact player-identifying details in any committed fixture. This step blocks end-to-end source-adapter acceptance, not Tasks 1–4 or preview development.
- [ ] Write failing tests for valid character links, invalid hosts/paths/IDs, redirects to unapproved destinations, timeouts, responses above 5 MB, non-JSON/private/unavailable responses, and unsupported payload shapes. Test normalized quantities/weights and explicit unknown fields using realistic minimal fixtures.
- [ ] Run `node --test tests/import-endpoint.test.js`; confirm each failure identifies missing adapter behavior.
- [ ] Verify the accessible source endpoint from the supplied character; do not invent a stable API or commit credentials. Implement only validated upstream shapes with allowlisted destination, 10-second timeout, 5 MB response limit, and no arbitrary URL fetch or unrestricted redirects. If access fails, return a clear error and PDF fallback rather than a successful empty character.
- [ ] Integrate endpoint middleware into Vite development and preview so existing LAN hosting supports imports. Document that a production static host needs this endpoint separately; do not deploy a backend in this task.
- [ ] Add `pdfjs-dist` from its official package registry and load its worker through Vite. Limit PDFs to 10 MB and 30 pages. Extract supported form fields/text layouts locally; report missing fields for review. Scanned/unsupported files produce a manual-entry message. Cancel/destroy parsing workers on dialog cancellation.
- [ ] Test source adapters on supplied samples, run the full suite/build, and commit with `feat: add reviewed character import source adapters`. If samples remain unavailable, label the adapters unverified in README and report that dependency; do not claim complete source support.

## Task 6: Import review, merge, and backup compatibility

**Files:** Create `src/data/character-import.js`, `src/components/CharacterImportDialog.jsx`, `tests/character-import.test.js`, `tests/backup-v2.test.js`; modify player page, store, `src/data/backup.js`, and `src/components/InventoryTools.jsx`.

**Interfaces:** `mergeCharacterDraft(state,draft,selection) -> {profile,equipment}` validates before returning; `applyCharacterImport` commits its output atomically. Backup version two includes profile/equipment and existing card collections; version one migrates without overwriting current player data.

- [ ] Write failing tests for selecting only some profile fields/equipment, repeated source imports, source-ID collisions across different characters, manual edits preserved unless selected, unrelated relics retained, cancellation, malformed drafts, and unknown weights never becoming zero. Test all-or-nothing backup validation and version-one preservation of current profile/equipment.
- [ ] Run `node --test tests/character-import.test.js tests/backup-v2.test.js` and confirm new behavior fails before implementation.
- [ ] Implement canonical validation and immutable merge. Namespace equipment source identity by character and source item identity. Imported generic equipment may be replaced by source selection; linked relics require explicit reviewed mapping and are never implicitly deleted or deduplicated merely by name.
- [ ] Implement file/link choice, progress/error UI, a draft preview with field/record selections, missing-field correction, and explicit save/cancel. Disable confirmation until required validation passes. Ignore results from a cancelled or superseded request.
- [ ] Upgrade backup export/import UI and schema, preserve recovery/attunement guarantees, and commit profile/equipment/card changes together. Keep current 5 MB JSON backup limit and explain oversized-file rejection.
- [ ] Run `npm test`, lint, and build; commit with `feat: review character imports and preserve player backups`.

## Task 7: End-to-end review and delivery

**Files:** Update `README.md`, package version only if user requests a release number, and fixes identified by verification.

- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`; investigate and report every failure.
- [ ] Exercise actual routes, character editing, card inspection, both import sources, source error paths, item weight edits, backup/reload, discard/recovery, and cancellation. Verify mobile/desktop, all themes, reduced motion, short-screen menu access, dialog focus return, and no horizontal overflow.
- [ ] Check a fresh browser save and a migrated legacy save without replacing the user's existing collection. Use disposable local fixtures or isolated test storage for destructive scenarios.
- [ ] Review the complete branch diff with an independent reviewer; correct important findings and rerun the affected checks.
- [ ] Save screenshots of the dedicated inventory and player pages. Document import limitations, supported PDF layouts, currency-weight exclusion, source verification status, and local endpoint hosting instructions.
- [ ] Commit final fixes and documentation. Report completed behavior, verification, remaining sample-dependent limitations, and commits. Leave Vite running with `--host`; do not push or merge.

## Execution recommendation

Native execution in this chat is recommended: tasks share a store contract and migration invariants, and there is already an established UI and branch. Implement sequentially, then perform independent branch review. Delegate task implementation only if the user chooses that execution approach.
