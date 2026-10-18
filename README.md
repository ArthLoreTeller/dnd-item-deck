# The Reliquary — D&D Item Deck

Version 1.3.0 is a browser-based homebrew item deck and character companion. Draw relics, track equipment, edit a character, learn SRD spells, and buy mundane supplies with saved currency.

## Version 1.3 routes and usage

The Corner Menu opens Deck (`#/deck`), Inventory (`#/inventory`), Character (`#/character`), Skills (`#/skills`), Spells (`#/spells`), Notes (`#/notes`), Shop (`#/shop`), and Settings (`#/settings`). Spell Tome (`#/spell-tome`) opens from Spells. Old `#relic-deck` and `#relic-inventory` bookmarks still work. Open the menu with Enter/Space or a tap; Escape closes it and returns focus to the menu button. Short screens can scroll the open shortcuts.

- Inventory combines relics and ordinary gear, with carried/attuned filters and stack quantities. Common and uncommon entries with matching names and rarity can group; relics must also have matching attunement, progression, and edited card state. Consume removes one unit of a consumable and offers Undo, including when the last unit disappears. Read Details sits beside the relic card. The collection scrolls by wheel, touch, and keyboard while its scrollbar stays hidden.
- Character uses identity and two rows of combat stats, then classes, abilities, attacks, resources, conditions, currency, and carried load. Save character retains hidden notes, features, languages, skills, and spells. Equipment does not recalculate combat stats.
- Skills provides 18 SRD descriptions through hover, keyboard focus, or a tap, with editable proficiency and bonus overrides. Save skills retains the character's other fields.
- Spell Tome searches 339 local SRD spells by name and level. Expand a spell for its full rules and Learn it; Spells groups learned entries by level and supports forgetting them. Notes automatically saves adventure notes, features, proficiencies, and languages as you edit.
- Shop searches 223 local purchase entries by name/category. Save currency before buying. Each Buy adds one unit and automatically pays from saved CP/SP/EP/GP/PP at copper-unit values. The remaining wallet is normalized from PP down to CP, providing change automatically. Insufficient funds change neither wallet nor equipment; purchase feedback explains the result. Shop and Character share currency and carried load.
- Settings saves Midnight, Evergreen, Blossom, Mahogany, Parchment, or Noir, sound on/off, master SFX volume, and reduced motion. These preferences and character data survive reloads in the same browser. Its SRD attribution section displays the approved notice and links to the source PDF and CC BY 4.0 license.

All new SFX are silent placeholders awaiting user-provided audio paths. See `src/audio/assets.js` and the handoff below. The release verification record is `docs/superpowers/verification/2026-10-13-version-1.3.md`.

## Player inventory and character sheet

Inventory displays relic artwork at its current attunement/progression stage and category placeholders for ordinary gear. Search, carried/attuned filters, name/rarity/weight sorting, and quantity/weight editing are available. The row's Read details action opens a relic journal or ordinary equipment editor; Deck's mini inventory inspects the original card.

Character tracks names, portrait URL or locally uploaded portrait, species, background, classes/levels, ability scores/modifiers, HP, AC, speed, size, currency, and an optional capacity override. Adventure notes now have a dedicated Notes page. Save character commits valid edits; equipment never recalculates combat stats.

Carrying capacity uses the [2024 rules](https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary#CarryingCapacity): Strength × 7.5/15/15/30/60/120 for Tiny/Small/Medium/Large/Huge/Gargantuan. Push/drag/lift is twice capacity. Stored gear is excluded. Unknown weight remains unknown, with partial totals explicitly labeled. Coins are tracked separately and excluded from load. Containers and feature-specific capacity changes require manual tracking/override; 2014 variant encumbrance is not applied.

Existing relic saves migrate to carried, quantity-one equipment with unknown weight. Draw/discard/recovery/reset keep linked weight metadata. Ordinary gear has separate removal undo. Version-three JSON backups include character/equipment, learned spells, consumable flags, and dormant relic weight metadata; version-one and version-two backups remain supported. Merge fills missing character values and adds missing equipment while retaining existing edits. Backups reference relic artwork URLs rather than storing those images; locally uploaded portraits may be embedded in character data.

## Local PDF import

Character → Import character PDF accepts exported character-sheet PDFs, processed locally with PDF.js. No character-link import or backend is required. [D&D Beyond documents its PDF export](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header). PDFs are limited to 10 MB and 30 pages; scanned or unsupported layouts return an explanation and leave manual entry available.

Supported inputs are standard AcroForm fields (`CharacterName`, `PlayerName`, `ClassLevel`, `Race`/`Species`, ability abbreviations, `AC`, `Speed`, `HPCurrent`, `HPMax`, `HPTemp`, coin abbreviations, `Equipment`) and explicit labeled text such as `Character Name: Aria` and `STR: 10`. Class entries use `Wizard 3 / Fighter 2`. Multiline equipment becomes ordinary gear with quantity one and unknown unit weight for review; it does not invent magic properties. Flattened sheets without supported labels may not be interpreted reliably and are rejected.

The preview allows corrections and explicit selection before an atomic save. Existing filled fields and previously imported equipment start unchecked; cancel saves nothing. Reimport identity uses the PDF character/player names and equipment names, so reimporting the same source avoids duplicates. Renaming the character/player or equipment can create new source entries; review the pack after such changes. Optional source-equipment replacement removes only that PDF character’s ordinary imported gear, retaining unrelated items and relics.

Verification includes a synthetic standard AcroForm PDF through the actual PDF.js parser and browser upload/review flow. No representative user-exported D&D Beyond PDF has been supplied, so compatibility with that export’s exact layout remains unverified. Always review extracted fields.

## Run locally

Use Node.js 24 and npm:

```sh
npm install
npm run dev
```

For other devices on your Wi-Fi or LAN, use `npm run dev -- --host` and share the Network URL printed by Vite.

```sh
npm test
npm run lint
npm run build
npm run preview
```

## Retained deck and recovery features

- The card-adjacent Read details icon opens a journal with readable lore, specifications, abilities, editable stats, and larger progression controls. The original card artwork remains intact, with an in-card Attune button that dissolves into the original top-right Unattune icon. Matching text spacing stays inside the painted boxes.
- Keep retains the relic in inventory and shows the card back. Discard offers undo; custom cards move into persistent recovery instead of being deleted.
- Backup & recovery downloads a JSON copy of the deck, inventory, and recovery collection. Import validates the whole file before merging, preserves current edits across collections, and respects the three-item attunement limit. Relic artwork is referenced by URL; locally uploaded portraits may be embedded in character data.
- Reset Deck explains that standard relic edits and progression reset, while custom cards and recovery remain. Download a backup first to preserve those edits.
- The circular Corner Menu opens the dedicated companion pages. Deck and Character keep their contextual D20 button; Deck keeps search and custom-card actions. Search and custom-card fields have explicit labels, dialog focus stays inside the dialog, and dice effect test buttons are removed.
- Artwork loads as it is needed instead of preloading every relic and upgrade. The browser title identifies The Reliquary.

## Deck and atmosphere

- Reset Deck restores the eleven built-in items and shows the card back. Custom inventory cards are preserved.
- Each remaining card has a draw weight: Common 60, Uncommon 25, Rare 10, Epic 4, Legendary 1. Actual odds depend on the remaining deck; search selects an item directly.
- Rarity badges and magical reveal effects accompany draws. A short lift leads into the reveal; keeping the item turns back to the deck, while Discard returns built-in items or moves custom cards into recovery. Outgoing artwork remains visible until the reverse flip finishes.
- Sound settings save your preference; actions remain silent while their new audio files are awaiting delivery.
- Click artwork for a layered 2.5D inspection view with pointer/touch tilt and moving highlights. Reduced-motion settings disable movement. Existing artwork is a single image layer, with separate aura, runes, frame, and shine layers.
- A fantasy interface emphasizes drawing and inventory, with desktop and mobile controls. Settings saves one of the six environment palettes.
- Attuning and unattuning crossfade the complete card face over 900ms with a gentle aura; reduced motion replaces the transition immediately.

## Data and behavior

The local skills, spell tome (339 spells), and shop catalog (223 purchase entries) in `src/data/srd/` use SRD 5.2.1, with no runtime API dependency. The official source is the [English SRD 5.2.1 PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf). Rules were transcribed with the [CC BY 4.0 Markdown edition](https://github.com/downfallx/dnd-5e-srd-markdown), checked against the official PDF, and adapted to plain-text rules, stable IDs, and copper-unit prices. Shop categories, Common rarity labels, and consumable flags are app metadata. Unknown weights remain `null`; ammunition prices and weights refer to the named source bundle. The catalog includes weapons, armor, tools and their variants, adventuring gear and focus variants, food and drink, mounts, vehicles, and barding at the source's four-times-price/two-times-weight rates; it excludes services and variable-price generic entries in favor of their concrete variants. The official PDF's Telekinesis description ends mid-sentence on page 168; the local entry preserves that wording.

This work includes material taken from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

The React/Vite frontend uses Zustand and browser local storage. There is no backend or account synchronization. Existing saved cards receive rarity defaults while retaining edited stats and progression. Clearing browser storage removes saved inventory.

Built-in items live in `src/data/defaultCards.json`. `src/data/rarity.js` defines rarity weights and legacy defaults. Custom cards enter inventory directly. Discarding built-in cards returns them unattuned to the deck; discarding custom cards moves them into recovery. Up to three items may be attuned. Item rules and progression are tracked manually. Backups use the versioned JSON format in `src/data/backup.js`; files over 5 MB, unsupported versions, duplicate IDs, and invalid card shapes are rejected without changing the collection.

Tests cover weighted draws, saved-data migration, reset/discard and recovery behavior, backup validation and merging, configurable progression thresholds, the attunement limit, and card rendering. Render tests use Rolldown to compile JSX before rendering it with React.

## Sound effects

Version 1.3.0 replaces the synthesized chimes with an audio-path manifest at `src/audio/assets.js`. Every action and rarity currently uses `WAITING_FOR_NEW_SFX`. Waiting markers, empty paths, muted playback, and zero volume are silent and issue no audio request. Playback failures never prevent an action.

To hand off the new SFX, supply a file path for each manifest slot: click, dice, draw, continue, reset, discard, attune, and common/uncommon/rare/epic/legendary reveal. Place supplied files under `public/` (for example `public/audio/click.mp3`) and replace only the corresponding waiting marker with its served path (`/audio/click.mp3`). Keep missing slots waiting. No replacement sounds ship with this release. Verify volume, mute, successful playback, and missing-file handling after assets are supplied.

| Action | Sound |
| --- | --- |
| General buttons | Waiting for click asset |
| Dice | Waiting for dice asset |
| Draw | Waiting for draw asset |
| Common / Uncommon / Rare / Epic / Legendary reveal | Waiting for each rarity asset |
| Continue | Waiting for continue asset |
| Reset | Waiting for reset asset |
| Discard / unattune | Waiting for discard asset |
| Successful attunement | Waiting for attune asset |
| Sound toggle | Silent |

Environment palettes use emerald and burnished gold (Evergreen), sakura pink, blush, petal white, sky blue, and branch brown (Blossom), aged oak and parchment (Mahogany), and golden parchment with crimson highlights (Parchment). Decorative colors use the supplied palette; readable companion ink tones support controls and small labels. Legacy storage keys `love`, `woody`, `warm`, and `optic` remain compatible and display as Blossom, Mahogany, Parchment, and Noir respectively.

Environment themes and their hover colors are isolated from the item cards. Card artwork, parchment, ink, controls, and internal hover colors retain their original styling in every theme.

Noir adds a black-and-white atmosphere. Rarity badges and item-type icons use surface-specific contrast colors for all six themes; rarity hues and weapon/material shapes retain their original meaning.

Choose a theme in Settings. Roll D20 on Deck or Character opens a numbered 3D die with unbiased 1–20 rolls, a matching forward-facing result, and natural 1/20 accents. Keyboard focus stays in the tray; Escape closes it. Reduced motion shows the result immediately. Dice rolls are independent of card drawing and remain silent pending the dice audio asset.
