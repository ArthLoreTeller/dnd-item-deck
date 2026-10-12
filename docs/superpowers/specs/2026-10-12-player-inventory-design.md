# Player inventory and character foundation

## Approved purpose

Expand the Reliquary into a player companion for 2024 D&D 5e. Inventory navigation opens a dedicated page displaying item artwork and cards. Equipment weight is tied to player information. Characters can be imported from a D&D Beyond character link or an exported character-sheet PDF, with a review step before saving.

Keep the current parchment cards, attunement animations, environment themes, recovery, and three-line navigation. Continue on `codex/version-1.2`.

## Pages and navigation

Use hash routes for the Vite-hosted application: `#/deck`, `#/inventory`, and `#/character`. Browser back/forward and direct links select the correct page. Existing `#relic-deck` and `#relic-inventory` links resolve to their corresponding pages.

The circular menu retains Deck, Inventory, Read details, Dice, and Sound and gains Character. Menu height must remain usable on short mobile screens. Read details refers to the selected item, becomes unavailable without a selection, and opens the existing journal. Dialogs return focus to the visible menu toggle or the inventory launcher.

The deck page retains drawing and item inspection. Replace the large inventory list alongside the deck with a compact inventory count/link. The inventory page is the primary equipment view.

## Inventory page

Show a responsive grid of artwork tiles with item name, rarity, attunement, quantity, unit weight, and carried status. Selecting a tile opens a full card inspection with access to the readable journal. Display the item's current artwork, including progression variants. Imported equipment without artwork gets a deliberate item-category placeholder rather than a broken image.

Provide search and sorting by name, rarity, and weight; filters for attuned items and carried equipment. Keep backup, import, recovery, and discard/undo accessible. Editing quantity or weight must not trigger discard, drawing, or progression changes.

Equipment records have a stable local ID, optional source ID, quantity, unit weight in pounds, carried status, and optional link to a relic card. Quantity is a positive integer. Weight is a finite nonnegative number or explicitly unknown. A value of zero means known weightless equipment; it must not stand in for missing weight. All existing owned cards migrate to quantity one, carried, and unknown weight unless a weight has been explicitly supplied.

Relics remain unique cards with the existing attunement/progression state. Mundane equipment uses quantities. D&D Beyond equipment is imported as ordinary equipment, with no fabricated magical abilities or attunement requirements. User-added artwork and manually created relics remain supported.

## Weight rules

Calculate known carried equipment weight as the sum of quantity multiplied by unit weight for carried items. Equipment marked stored contributes no carried weight. Equipped equipment still contributes weight. Show how many carried entries have unknown weight; a partial total must be labeled as incomplete.

Use the 2024 carrying-capacity table: Tiny Strength × 7.5 pounds, Small/Medium × 15, Large × 30, Huge × 60, and Gargantuan × 120. Drag/lift/push capacity is twice carrying capacity. Permit an explicit character capacity override for features and table rulings, with its reason displayed.

Display current known load, capacity, remaining capacity, and an over-capacity warning. At exactly capacity the character is within the limit. When unknown weights exist, do not imply that the character is conclusively within capacity. Without Strength and size, show the load but request those fields before calculating capacity. Do not apply 2014 variant encumbrance penalties.

Initially currency is tracked separately from equipment load, with this exclusion clearly stated beside the total. Container nesting, magical-container weight rules, and automated feature interpretation are future extensions; a stored/carried flag and explicit capacity override cover manual tracking in this release.

Rule source: https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#CarryingCapacity

## Player profile

This release has one active player profile and its equipment collection. Structure the data with a character ID so later character switching does not require mixing inventories.

Provide editable portrait URL, character and player names, species, background, class/level entries, six ability scores, current/max/temporary HP, AC, speed, size, currency denominations, and notes. Derived ability modifiers and carrying capacity update when relevant fields change. Unknown imported fields stay unset, not invented.

The profile is a tracking sheet, not an automated character builder. HP, AC, and speed are player-entered or imported values; changing equipment does not silently recalculate them. Character spells and combat automation can build on this foundation later.

## Import flow

Character page → Import → choose D&D Beyond link or PDF → parse into a draft → review character and equipment fields → correct missing values → confirm.

The preview identifies supplied, missing, and unsupported fields. Saving is atomic. Repeated imports use source character and equipment identifiers where available to avoid duplicates. Importing updates the active profile only after confirmation and shows which existing values would be replaced. Preserve current relics, custom artwork, and manual equipment edits unless their replacement is explicitly selected in the preview. Cancellation or malformed input leaves saved data unchanged.

### PDF

Parse exported PDFs locally in the browser using a maintained PDF library. Prefer structured form fields; use text extraction for text-based exports with supported layouts. Do not upload PDFs to an external parsing service. Scanned or unsupported PDFs produce a clear explanation and retain manual entry as an available path. Show extracted values for review rather than claiming complete character-rule fidelity.

Support documentation confirms PDF export: https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header

### Character link

Accept D&D Beyond character links and validate their character ID. A same-origin local import endpoint retrieves accessible character data; avoid assuming a browser can fetch cross-origin data directly. The endpoint accepts a character ID, not an arbitrary fetch URL, and uses an allowlisted D&D Beyond destination with bounded response size and timeout.

No documented stable public import API has been verified in this research. Test the actual accessible response against a user-supplied character before finalizing this adapter. Link import must report unavailable/private/unsupported responses honestly and direct the user to PDF import. Do not use account credentials or bypass access controls. There is no automatic background synchronization in this release.

A working link adapter and representative PDF parsing require real source samples for acceptance testing. The user has approved both routes but has not yet supplied a character link or PDF. This dependency does not prevent page, inventory, profile, weight, or import-preview development; it prevents claiming those source adapters have been verified end to end.

## Persistence and migration

Retain existing local saves and version their migration. Extend the existing persisted store with the active player profile and equipment records so cross-collection operations can commit in one state update. Keep character, equipment, import, and weight logic in separate modules and expose focused selectors to the pages. Link relic equipment by card ID, and update linked records consistently on draw, discard, recovery, and import. Derived totals are calculated rather than persisted as a second source of truth.

Upgrade backups to a new version containing profile, equipment, deck, owned relics, and recovery. Continue accepting version-one backups with the same merge guarantees. Validate the complete import before committing a single store update. Missing profile/equipment data in an old backup must not erase current player information.

## Verification and acceptance

- Inventory navigation shows its dedicated artwork grid and supports back/forward and direct links.
- Existing cards and progression remain intact after migration and backup round trips.
- Quantity, carried status, missing weights, exact-capacity boundaries, all creature sizes, and overrides produce correct load results.
- Unknown fields remain visibly unknown and invalid numbers cannot corrupt totals.
- Selecting a relic provides full card and journal inspection; ordinary equipment has a useful detail view.
- Import cancellation, invalid files, unavailable links, duplicate imports, and selected replacement behavior are tested.
- Link and PDF imports are verified against supplied samples before being described as working end to end.
- Mobile/desktop layouts, keyboard access, focus restoration, themes, and reduced motion are checked.
- Run the complete existing test suite, relevant new data/behavior tests, lint on changed files, and production build.

## Delivery order

First introduce player/equipment persistence and migrations, then dedicated pages and inventory artwork, then weight/profile editing, then import preview and source adapters, and finally backup integration and end-to-end verification. Each step keeps the current deck usable. A detailed implementation plan follows review of this specification.
