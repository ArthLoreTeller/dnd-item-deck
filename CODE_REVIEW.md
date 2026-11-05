# The Reliquary · Code review

## 1. Executive Summary

The core draw, discard, attunement-limit and D20 mechanics are small enough to verify, and all 25 existing tests pass. The highest risk is the save system: two open copies of the app can overwrite one another, and a failed load can turn a recoverable inventory into a fresh deck that is subsequently saved over the original. The largest avoidable startup cost is 12.1 MB of item artwork requested before the first draw. In the interface, the most consequential gaps are inaccessible item rules, custom-card fields that silently lose or invent information, and multiple implementations of focus and selection.

**Scope and evidence.** Reviewed the current workspace at commit `8fe02c5`, including the React entry point and every component, Zustand stores, all eleven item records and asset references, styles, motion, audio, dice, themes, tests, build configuration, manifest, lockfile and project documentation. Node 24.20.0 ran 25/25 tests successfully. Oxlint exited successfully with six warnings in obsolete components. The production build succeeded at 95.01 kB gzipped JavaScript and 13.37 kB gzipped CSS, excluding images. Store reproductions below used the actual module with isolated in-memory storage. A local production preview verified startup, search and Escape focus behavior. Other UI findings follow from rendering conditions, event handlers and stylesheet rules. Image byte counts are source file sizes, not a timed network trace.

**Security and infrastructure.** The app renders authored text as React text and passes image URLs to image elements. No raw HTML execution path, embedded credential, authenticated route, database or application API surfaced in the reviewed code. Remote custom artwork contacts its chosen host. Storage integrity and handling of that optional network request are addressed below. Database indexes, server-side calculations, query batching and an API cache would add infrastructure to a local-only app.

## 2. Prioritised Action Items

### P0 · Reproducible loss of saved inventory

#### 01 · Stop stale tabs from overwriting newer cards

**Affected:** `src/store/useCardStore.js` — persist configuration, inventory mutations and `clearToast`.

**Problem.** Open two instances on the same starting save. Create a custom card in A, then draw in B. The stored inventory contains B's draw and loses A's card. Each instance writes its entire private snapshot. Even clearing a toast can publish stale inventory.

**Fix prompt:** In `src/store/useCardStore.js`, prevent two tabs from overwriting each other's deck and inventory. Coordinate durable mutations so a stale writer must reload/reapply its operation against the latest save or explicitly stop and surface a conflict. Handle overlapping writes, including simultaneous draws of the same item. Exclude UI-only actions from persistence. In `tests/store.test.js`, use independent store instances sharing storage and verify both custom-card survival and uniqueness across deck and inventory.

#### 02 · Preserve recoverable cards when loading fails

**Affected:** `src/store/useCardStore.js` — `merge` and hydration lifecycle; `src/data/rarity.js` — `normalizeCard`.

**Problem.** A save containing a null deck entry and a valid custom inventory card fails hydration. The UI starts from eleven defaults with an empty inventory. The next draw overwrites the recoverable card. A truthy non-array also breaks `.map()`. Spreading the entire saved object over the live store allows unrelated keys to replace actions.

**Fix prompt:** Harden hydration in `src/store/useCardStore.js` and `src/data/rarity.js`. Read only documented durable fields, validate container and row shapes before use, preserve valid empty decks, custom records and edited fields, and surface recovery when the save is unreadable. Preserve the original payload before any recovery write and prevent ordinary draws from replacing it after a failed load. Add tests in `tests/store.test.js` for malformed JSON, mixed valid/invalid records, stray action keys and legacy saves.

### P1 · Likely bugs or material UX and performance impact

#### 03 · Report failed saves before claiming success

**Affected:** `src/store/useCardStore.js` — persisted actions; `src/components/CustomCardModal.jsx` — `handleSubmit`; `src/components/Card.jsx` — stat edits.

**Problem.** Forcing storage to throw `QuotaExceededError` left a new custom card visible in memory while the write threw and disk retained the old inventory. Reload loses the edit. Long artwork URLs and unrestricted card text make the storage limit reachable. Failure also interrupts code after the store call.

**Fix prompt:** Make durable edits in `src/store/useCardStore.js` return a reliable save outcome, including unavailable storage and quota errors. In `CustomCardModal.jsx` keep the draft available and only close/show success after a successful addition. In `Card.jsx` make unsaved edits visible and retryable. Test failed create, failed edit, and a successful retry without duplicate cards or misleading success toasts.

#### 04 · Load item artwork when it is needed

**Affected:** `src/App.jsx` — image-preload effect at lines 189–197; `src/components/Card.jsx` — artwork selection; `public/assets/`.

**Problem.** On a fresh deck the effect requests 14 distinct item PNGs totalling 12,103,382 bytes, including attuned and level-three art. Adding the visible card back brings the footprint to 13,298,750 bytes. Every deck change repeats the traversal and allocates image objects. Later requests may hit browser cache.

**Fix prompt:** Remove the deck-wide image preload from `src/App.jsx`. Keep the visible card back available immediately and load the selected face's artwork at reveal time in `src/components/Card.jsx`. Verify cold startup requests no hidden item art, then check draw, search, higher-stage art, reverse flips and the viewer. Measure cold bytes before considering image conversion; retain compatibility with saved image URLs.

#### 05 · Make normal-item rules and specifications available

**Affected:** `src/components/Card.jsx` — specs guard around line 575; `src/components/CustomCardModal.jsx` — Specs tab; `src/data/defaultCards.json`.

**Problem.** All nine normal built-ins are excluded by the attuned-only specs guard. A player inspecting a kunai cannot see its stored range and damage there. The creator also accepts normal-item specs that can never be viewed. The talismans' stored specs require attunement despite their normal type. The wand visibly says “rare” in its type while its badge says Legendary.

**Fix prompt:** In `src/components/Card.jsx`, expose populated specifications for normal items without an attunement step. In `src/data/defaultCards.json` and `CustomCardModal.jsx`, reconcile attunement requirements with playable type, and remove duplicate rarity text or clearly distinguish game rarity from draw rarity if intentional. Account for existing saved built-ins without overwriting player edits. Add rendering checks for a normal kunai, a custom normal item and the wand.

#### 06 · Validate the entire custom-card draft across tabs

**Affected:** `src/components/CustomCardModal.jsx` — tab panels, `handleSubmit`, `handleKeyDown`, ability filtering.

**Problem.** Only the mounted tab gets browser validation. An invalid artwork URL can pass after switching tabs. A missing or whitespace-only name on another tab makes Create silently do nothing. A progressive ability with a description but no title is silently dropped, whereas the same data on a standard item survives. Enter is suppressed across text inputs.

**Fix prompt:** In `src/components/CustomCardModal.jsx`, validate the complete draft on submit independently of the active tab. Identify the offending field, switch to its tab, focus it and preserve the draft. Use one explicit rule for incomplete abilities across all card types. Restore ordinary keyboard submission where appropriate. Verify blank and whitespace names, malformed artwork URLs on a hidden tab, and description-only abilities for each type.

#### 07 · Start each new card with an honest, fresh draft

**Affected:** `src/components/CustomCardModal.jsx` — initial form data, `activeTab` and `handleSubmit`; `src/App.jsx` — permanently mounted creator.

**Problem.** Entering only a name silently creates a longsword with spellcaster requirements and a Passive Aura. Other type-specific examples are stored even when hidden. After a successful creation, reopening the dialog restores the previous card and tab; Create again produces a duplicate with a different ID.

**Fix prompt:** In `src/components/CustomCardModal.jsx` and its mount in `src/App.jsx`, move example stats, abilities and specs into placeholders. Save only meaningful fields for the chosen type. Reset to General and a clean draft after success or explicit cancellation, while retaining input after validation or storage failure. Replace timestamp-only IDs with collision-resistant custom IDs retaining the custom- prefix. Verify creating two different cards consecutively.

#### 08 · Make expanded item text readable by keyboard

**Affected:** `src/components/Card.jsx` — lore, ability and specification click targets and `popoverText`; `src/hooks/useDialogFocus.js`.

**Problem.** The card presents rules at 7–8 px and exposes the expanded versions through click-only divs. Keyboard users cannot open those views. The overlay also lacks dialogue semantics, focus management and Escape dismissal.

**Fix prompt:** In `src/components/Card.jsx`, replace each clickable lore, ability and specs region with a keyboard-operable control. Present expanded text in a labeled, readable view using shared focus handling from `src/hooks/useDialogFocus.js`. Verify Enter/Space opens each kind, long rules scroll, Escape closes, and focus returns to the triggering control.

#### 09 · Keep artwork inspection separate from unattunement

**Affected:** `src/App.jsx` — inspection hint; `src/components/Card.jsx` — `getArtworkSrc`, image button and text fallback; `ArtworkViewer.jsx`.

**Problem.** A card without art still tells the player to tap its artwork. On an attuned card without an image, tapping the descriptive text instead unattunes the item. A broken external URL still creates an inspection button and opens a broken image.

**Fix prompt:** In `src/components/Card.jsx` and `src/App.jsx`, show artwork inspection only for a successfully loaded image. Remove the unattune action from descriptive text and keep the labeled attunement button. Gracefully hide failed images and suppress the inspection hint for both absent and failed art; clear failure state when the URL changes. Keep `ArtworkViewer.jsx` limited to a usable source and apply a no-referrer policy to external artwork in both views. Check no-art, broken-URL and valid-image cards.

#### 10 · Make destructive actions distinguishable before activation

**Affected:** `src/App.jsx` — `DraggableInventoryCard`, `handleReturnToDeck`, `handleResetDeck`; `src/store/useCardStore.js` — `discardCard`, `resetDeck`.

**Problem.** The same “Discard” button and row cross return a built-in but permanently delete a custom card. Only the drag-hover text explains the distinction in advance. Reset immediately wipes built-in progression, edits and attunements. On small screens the one-click controls are the primary path.

**Fix prompt:** In `src/App.jsx`, label custom deletion and built-in return distinctly on the card face and inventory row. Before permanently deleting authored data or clearing built-in edits on Reset Deck, provide a specific confirmation or a genuinely recoverable undo. Reuse the behavior across click, touch and drag. Preserve the documented reset semantics in `src/store/useCardStore.js`. Verify cancel/undo with custom and edited progressive items.

#### 11 · Preserve the printed card layout on narrow phones

**Affected:** `src/index.css` — max-width 359px rules; `src/components/Card.jsx` — absolute-positioned shelves and progress controls.

**Problem.** The small-screen rule shrinks the design box from 320 × 500 to 288 × 450 while internal coordinates remain in the original system. The third shelf starts at 406px and extends beyond the card. The desktop implementation already scales the whole design inside a reserved outer box.

**Fix prompt:** In `src/index.css`, apply proportional scaling to the complete 320 × 500 card on narrow screens, reserving its scaled layout size. Keep the absolute coordinates in `src/components/Card.jsx` aligned with the printed background. Verify at 320px and 359px viewport widths with an attuned level-three wand, footer actions, and reverse flips.

### P2 · Compounding debt, inconsistent patterns and bounded defects

#### 12 · Patch the development dependencies flagged by npm

**Affected:** `package-lock.json` — Vite 8.2.1, source-map-js 1.2.1 and postcss-selector-parser 6.1.4.

**Problem.** The lockfile audit reported two high-severity packages and one moderate. Vite's advisories include conditional development-server file exposure and editor-launch command execution. Crafted source maps or selectors can exhaust build-process CPU. Exposure depends on the development environment or crafted input; the production deployment consists of static files. [Vite filesystem advisory](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) · [Editor-launch advisory](https://github.com/advisories/GHSA-r825-w8mm-5pxw) · [Source map advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) · [Selector parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)

**Fix prompt:** Refresh the affected development dependency resolutions in `package-lock.json` within compatible ranges. Use the current npm advisory output to select patched releases for Vite, source-map-js and postcss-selector-parser. Inspect the resolved tree, run a clean install under Node 24, repeat the lockfile audit, then run tests, lint and the production build.

#### 13 · Keep one authoritative copy of each owned card

**Affected:** `src/store/useCardStore.js` — active selection, update, discard and persistence; `src/App.jsx` — displayed card and selected-row state; `src/motion/deckMotion.js`.

**Problem.** An owned card is also saved as a full active card and held as an animation snapshot. A legacy fixture already supplies inconsistent levels between the persisted copies. Continue and reload show the deck back while an inventory row can still look selected. Search writes selection twice.

**Fix prompt:** In `src/store/useCardStore.js` and `src/App.jsx`, resolve live selection from inventory by ID, migrate old active-card objects by ID and clear or distinguish selection when the deck back is shown. In `src/motion/deckMotion.js`, keep the temporary snapshot needed for the reverse flip. Ensure unsuccessful store actions cannot reveal an unowned card. Test stat edits, stale saved selection, search, continue, reset and discard during a reveal.

#### 14 · Keep typing a stat from rewriting and rerendering the whole bag

**Affected:** `src/components/Card.jsx` — `StatInput`; `src/store/useCardStore.js` — `updateCard` and persist; `src/App.jsx` — inventory subscriptions and sorting; `src/components/ItemSearchModal.jsx`.

**Problem.** Every character maps the inventory, serializes all durable data synchronously, and causes the app to render the row list and recompute the selected sort. Toast-only changes also serialize the save. The closed search dialog subscribes to the deck and sorts on deck changes. Costs grow with an unrestricted custom inventory.

**Fix prompt:** Profile a large custom inventory in `src/App.jsx`, `src/components/Card.jsx`, `ItemSearchModal.jsx` and `src/store/useCardStore.js`. Keep typing responsive, commit final values reliably on navigation/blur and preserve outstanding edits on a save failure. Isolate row rendering and UI-only state, and mount search work only while open. Verify with write counts and a render profile before adding broader caching.

#### 15 · Use a single dialog focus lifecycle

**Affected:** `src/hooks/useDialogFocus.js`; `src/components/{ItemSearchModal,ArtworkViewer,DiceTray}.jsx`.

**Problem.** Search autofocus runs before the shared hook captures the opener. In the production preview, Escape returned focus to the page instead of Find a relic. Artwork and dice independently implement scroll locking, inert state, Escape and tab trapping. Their root-only locking also differs from the sibling handling used for inline dialogs.

**Fix prompt:** In `src/hooks/useDialogFocus.js`, support both inline and portaled dialogs, an explicit initial-focus target, and reliable restoration of the opener, prior inert state and scroll position. Remove competing autoFocus from `ItemSearchModal.jsx` and use the shared behavior in `ArtworkViewer.jsx` and `DiceTray.jsx`. Verify keyboard entry/exit, dice while rolling, an open toast, and artwork's delayed close. Start each new search with a deliberate query state.

#### 16 · Give inventory and form controls unambiguous names and focus

**Affected:** `src/App.jsx` — `DraggableInventoryCard`, sort, mobile selection; `src/components/{CustomCardModal,ItemSearchModal}.jsx`.

**Problem.** A draggable row with button semantics contains another button for discard. Keyboard instructions and Space selection can disagree. On phones, choosing a row changes a card above the viewport without moving focus to it. Most creator labels lack control associations; the preview's accessibility tree also exposed an unnamed sort selector, unnamed search field and identical “Add to Bag” buttons.

**Fix prompt:** In `src/App.jsx`, use sibling native controls for item selection and removal, provide accurate drag instructions, and label inventory sorting. On mobile selection, take users to the selected card with a practical return path; manage focus when draw/continue replaces the active button. In `CustomCardModal.jsx` and `ItemSearchModal.jsx`, associate visible labels, name glyph-only controls by action, and include the item name in result-button labels. Verify keyboard, touch and assistive-technology navigation.

#### 17 · Make progression reachable and legible at every supported threshold

**Affected:** `src/components/Card.jsx` — `handleProgress`, `renderCheckboxes`; `src/components/CustomCardModal.jsx` — progressive labels.

**Problem.** The displayed count uses maxProgress, but the level calculation always requires 20 marks. At a saved maximum of 10, level two is unreachable. Each mark is a 7 × 7 px button, creating up to 40 adjacent tiny targets and keyboard stops. Empty ability arrays are truthy and can expose tracks with nothing to unlock.

**Fix prompt:** In `src/components/Card.jsx`, use one validated progression threshold for rendering and level calculation. Give each track a usable control with a current/maximum readout and accessible increments and decrements. In `CustomCardModal.jsx`, match the labels to the threshold and define behavior for empty stages. Verify both tracks, lowering a level, and legacy cards with a non-20 maximum.

#### 18 · Honor reduced motion throughout card flips

**Affected:** `src/components/Card.jsx` — `handleFlip`, inline keyframes and attunement transition; `src/index.css`; `src/motion/useDeckMotion.js`.

**Problem.** Deck and dice consult the preference in JavaScript. The card's base/attuned flip still waits 250 ms to change face and 500 ms to unlock, even when CSS collapses its animation. Its timeouts also survive unmount. Static animation CSS is reinserted on the outgoing snapshot.

**Fix prompt:** Update `Card.jsx` to switch the inspected face immediately under reduced motion and clean up pending flip timers on unmount or card replacement. Move card-wide keyframes to `src/index.css`. Preserve reverse-flip snapshots in `useDeckMotion.js`. Verify fast switching, repeated flips and reduced-motion interaction timing.

#### 19 · Show the icon the creator chose

**Affected:** `src/components/CustomCardModal.jsx` — emoji input; `src/components/Icon.jsx` — `getLucideIcon`.

**Problem.** The creator accepts an emoji but the renderer maps unknown strings to a generic star. A name containing “kunai” also overrides an explicit custom icon. The two-code-unit limit cuts off multi-code-point emoji.

**Fix prompt:** In `CustomCardModal.jsx` and `Icon.jsx`, define one supported custom-icon format and display the saved choice in inventory. Preserve built-in semantic icons and material colors. Support complete emoji sequences and existing custom cards; verify that a custom item named Kunai can still use its authored icon.

#### 20 · Consolidate repeated card and form markup

**Affected:** `src/components/Card.jsx` — ability shelves and outgoing snapshot; `src/components/CustomCardModal.jsx` — four ability editors; `src/App.jsx` — desktop/mobile status and action controls.

**Problem.** Nearly identical ability rows have separate click, spacing and rendering logic. The editor repeats the same title/description/removal interface for each group. Desktop and mobile copies of reset, creation and attunement status can drift. The existing files named InventoryGrid and MainDeck are obsolete implementations, making ownership harder to discover.

**Fix prompt:** In `Card.jsx`, extract the shared ability list and keep stage visibility and shelf placement explicit. In `CustomCardModal.jsx`, use one labeled ability editor for each list key. In `App.jsx`, share status/actions across responsive layouts and move coherent inventory or deck sections into active modules only where it reduces duplication. Preserve the printed layout, outgoing snapshot, drag behavior and mobile controls. Verify each type and breakpoint.

#### 21 · Make rarity data authoritative in one place

**Affected:** `src/data/{defaultCards.json,rarity.js}`; `src/components/RarityBadge.jsx`; `src/App.jsx` — odds copy and rarity color.

**Problem.** All eleven item rarities are duplicated in a hand-maintained legacy lookup. The odds explanation duplicates the weight table. Weighted selection spreads card objects just to read rarity, and each badge normalizes twice. Inherited property names such as “constructor” pass the current lookup check and yield invalid weights.

**Fix prompt:** In `src/data/rarity.js`, use own-key validation and derive legacy rarity defaults from the built-in catalog without creating an import cycle. Supply a scalar lookup for weights, colors and badges. In `RarityBadge.jsx` and `App.jsx`, render the resolved value once and derive odds copy from RARITIES. Test unknown/inherited keys, preserved legacy IDs and weighted boundaries.

#### 22 · Replace fragile theme and layout selectors with explicit targets

**Affected:** `src/index.css` — theme overrides, button states, Woody background and desktop inventory sizing; `src/App.jsx`; `src/theme/themes.js`.

**Problem.** Substring selectors for background utilities also match hover classes at rest. Repeated class names force action colors to win. A later Woody background loses to a higher-specificity earlier rule. The desktop height selector targets the final trash wrapper while the inventory list is the scrolling element. Theme variables are applied in a post-render effect, allowing initial default colors on a saved light theme.

**Fix prompt:** In `App.jsx`, `src/theme/themes.js` and `src/index.css`, target themed surfaces, semantic actions and the inventory scroller with explicit classes and a single palette application point. Apply a saved palette before the first visible paint. Consolidate duplicate and shadowed rules, retaining printed-card isolation. Check six themes, focus/hover, portal surfaces and short desktop windows.

#### 23 · Remove the abandoned implementation and unused dependency

**Affected:** `src/components/{InventoryGrid,MainDeck,DraggableCard,TrashZone}.jsx`, `src/App.css`, `package.json`, `package-lock.json`, unused public art.

**Problem.** These components are unreachable from the entry point and tests. InventoryGrid refers to a missing DroppableTrash module and imports Card as a default export. The unused files account for all six lint warnings. Audio uses native Web Audio, leaving use-sound unused. Two Midori images add about 1.14 MiB to the static distribution.

**Fix prompt:** Remove the four unreachable components under `src/components`, unimported `src/App.css`, and unused use-sound dependency in `package.json`; regenerate the lockfile. The two Midori PNGs under `public/assets/Normal` have no shipped catalog or historical source reference. Remove them if those public URLs have no external compatibility commitment. Keep active App.jsx inventory and trash handlers. Verify tests, lint, production build and artwork paths.

### P3 · Polish and developer experience

#### 24 · Correct tab branding and stale project guidance

**Affected:** `index.html`, `README.md`, `src/store/useCardStore.js` — reset comment.

**Problem.** The production tab reads “dnd-card-app” and requests a missing favicon. The README first lists five themes and adds Optic later, and the store comment describes reset as excluding inventory cards despite restoring the entire built-in deck.

**Fix prompt:** In `index.html`, set the title to The Reliquary and remove the missing favicon reference or point it to a shipped icon. In `README.md`, list all six atmospheres together and describe the current reset behavior once. Update the misleading reset comment in `src/store/useCardStore.js`. Verify the production page title and asset path.

#### 25 · Make audio cues and dice geometry easier to change safely

**Affected:** `src/audio/sound.js` — `playSound`; `src/dice/d20.js` — face generation; `src/components/DiceTray.jsx` — roll lifecycle.

**Problem.** Cue selection is a long nested conditional. Dense vector and matrix expressions obscure which basis describes a numbered face and which rotation lands it. The root click capture can also play a generic click alongside the dice roll sound, unlike actions marked data-silent.

**Fix prompt:** In `sound.js`, move cue definitions into small lookup tables. In `DiceTray.jsx`, ensure a roll plays only its intended sounds. Format the D20 face-generation code in `d20.js` and name/document the orientation and inverse landing matrices. Preserve rejection sampling, face orientation and reduced-motion timing. Run the existing dice tests and check a roll in the tray.

## 3. Quick Wins

**One batch prompt**

> Clean up The Reliquary's unused code without changing its gameplay. Delete the four obsolete component files and src/App.css listed below; the live inventory and trash components are in src/App.jsx. Remove use-sound from package.json and refresh package-lock.json. In src/App.jsx remove the obsolete level sort alias, second selection write in the search callback, redundant progressive condition, empty reset span and stale import comment. Remove the unread toast setter and unreachable default-array fallbacks from src/store/useCardStore.js. In src/components/ItemSearchModal.jsx remove autoFocus so useDialogFocus owns initial focus. Set the index.html title to The Reliquary and remove the broken favicon reference. Run npm test, npm run lint and npm run build. Verify a search selection still reveals exactly one item and Escape restores the opener.

## 4. Redundancy Removal Log

Paths refer to the repository root. Each entry is an independent deletion or names the replacement needed to preserve behavior.

- `src/components/InventoryGrid.jsx` — unreachable legacy inventory; one import points to a missing module.
- `src/components/DraggableCard.jsx` — referenced only by the obsolete inventory implementation.
- `src/components/MainDeck.jsx` — superseded by the deck in App; includes an unused selection binding.
- `src/components/TrashZone.jsx` — unexported stub; remove its unused DndContext and useDraggable imports with the file.
- `src/App.css` — unused template stylesheet; main imports index.css.
- `package.json` dependency `use-sound` — zero imports; regenerate lockfile to remove orphaned resolutions.
- `public/assets/Normal/midori.png` — no shipped or historical catalog reference; check externally authored URLs before retiring.
- `public/assets/Normal/midori-attune.png` — same orphaned artwork pair and compatibility consideration.
- `src/store/useCardStore.js#setToastMessage` — no caller; store actions set their own messages.
- Both `defaultCards || []` fallback arms in `useCardStore.js` — the preceding map always returns an array.
- `src/App.jsx` search callback's `setActiveCard(card)` — drawCardById already selects and persists that card; keep select(card) for motion.
- `src/App.jsx` sort alias `case "level"` — no option or persisted sort value supplies it.
- `src/App.jsx` inventory condition `|| item.type === "progressive"` — progressive already satisfies isAttunable; the inner conditional's empty-string branch is likewise unreachable.
- `src/App.jsx` Icon import's scaffolding comment — describes creating a file already present.
- `src/App.jsx` empty span before mobile Reset Deck — no visual or semantic content.
- `src/App.jsx` search launcher's placeholder color class — attached to a span with no placeholder.
- `src/App.jsx` empty-front “Select an item…” placeholder — displayedCard is absent only on the hidden/inert face in normal motion states; leave the unpopulated face empty.
- `src/components/Card.jsx#getFadeClass` and its ignored delay arguments — inline the existing constant class where needed.
- `Card.jsx` hieroglyph-etch / animate-hieroglyph — no element uses the animation.
- `Card.jsx` unlink-glow-burn / animate-unlink-burn — no live trigger.
- `Card.jsx` button-consume / animate-button-consume — no live trigger.
- `Card.jsx` border-1 class on the progress track — absent from configured Tailwind utilities.
- `CustomCardModal.jsx` formData.description initialization and read — no input ever changes it; preserve the current submitted description value from lore for compatibility.
- `ItemSearchModal.jsx` autoFocus — conflicts with the hook's initial focus and opener capture.
- `CustomCardModal.jsx` and `ItemSearchModal.jsx` animate-in, fade-in and zoom-in-95 — no installed animation plugin or stylesheet implements them.
- Six built-in `source: "default"` entries in `src/data/defaultCards.json` — no reader; existing saved extra properties can be tolerated.
- `src/index.css` .draw-heading, its h2 rule and selector-list references — no markup emits that class.
- `src/index.css` .rarity-reveal, @keyframes relic-reveal and reduced-motion selector arm — replaced by .rarity-draw-effect.
- `src/index.css` .theme-swatches span rules — the swatches contain buttons.
- `src/index.css` first duplicate Love bg-slate-700 rule — the identical later rule supplies the declaration.
- `src/index.css` first duplicate .dice-critical impact-color rule — the later declaration is identical.
- `src/index.css` .dice-launch span — the launcher contains an SVG.
- `index.html` /favicon.svg link — target absent from the static distribution.

Retain the direct Rolldown development dependency used by the JSX render tests, the development-only D20 effect previews, legacy rarity migration, and the outgoing-card snapshot used by the reverse flip. Each has a current consumer.
