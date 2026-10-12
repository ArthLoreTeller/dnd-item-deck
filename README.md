# The Reliquary — D&D Item Deck

Version 1.1 is a browser-based homebrew item deck and inventory companion. Draw a random relic, find a specific item, create custom cards, attune magic items, and track three-stage item progression.

## Run locally

Use Node.js 24 and npm:

```sh
npm install
npm run dev
```

```sh
npm test
npm run lint
npm run build
npm run preview
```

## Version 1.1

- Reset Deck restores the eleven built-in items and shows the card back. Custom inventory cards are preserved.
- Each remaining card has a draw weight: Common 60, Uncommon 25, Rare 10, Epic 4, Legendary 1. Actual odds depend on the remaining deck; search selects an item directly.
- Rarity badges and magical reveal effects accompany draws. A short lift leads into the reveal; Continue keeps the item and turns back to the deck, while Discard returns built-in items or deletes custom cards. Outgoing artwork remains visible until the reverse flip finishes.
- Synthesized button, draw, reveal, and attunement chimes require no remote assets. The sound toggle saves your preference.
- Click artwork for a layered 2.5D inspection view with pointer/touch tilt and moving highlights. Reduced-motion settings disable movement. Existing artwork is a single image layer, with separate aura, runes, frame, and shine layers.
- A fantasy interface emphasizes drawing and inventory, with desktop and mobile controls. The Atmosphere selector saves Midnight, Evergreen, Love, Woody, or Warm environment palettes.
- Attuning and unattuning crossfade the complete card face over 520ms with a gentle aura; reduced motion replaces the transition immediately.

## Data and behavior

The React/Vite frontend uses Zustand and browser local storage. There is no backend or account synchronization. Existing saved cards receive rarity defaults while retaining edited stats and progression. Clearing browser storage removes saved inventory.

Built-in items live in `src/data/defaultCards.json`. `src/data/rarity.js` defines rarity weights and legacy defaults. Custom cards enter inventory directly. Discarding built-in cards returns them unattuned to the deck; discarding custom cards deletes them. Up to three items may be attuned. Item rules and progression are tracked manually.

Tests cover weighted draws, saved-data migration, reset/discard behavior, the attunement limit, and card rendering. Render tests use Rolldown to compile JSX before rendering it with React.

## Sound effects

All sounds are local Web Audio sine-wave chimes, not recorded samples.

| Action | Sound |
| --- | --- |
| General buttons | Short, high two-note click |
| Draw | Four-note ascending chime |
| Common / Uncommon reveal | Two-note rarity chime |
| Rare reveal | Three-note rising chime |
| Epic reveal | Four-note major arpeggio |
| Legendary reveal | Five-note major arpeggio with a high finish |
| Continue | Soft descending two-note chime |
| Reset | Three descending notes |
| Discard / unattune | Lower descending two-note chime |
| Successful attunement | Three-note ascending chime |
| Sound toggle | Silent |

Environment palettes use emerald and burnished gold (Evergreen), sakura pink, blush, petal white, sky blue, and branch brown (Love), aged oak and parchment (Woody), and golden parchment with crimson highlights. Decorative colors use the supplied palette; readable companion ink tones support controls and small labels. Existing Love/Warm saved preferences map to Love · Sakura/Golden Parchment.

Environment themes and their hover colors are isolated from the item cards. Card artwork, parchment, ink, controls, and internal hover colors retain their original styling in every theme.

Optic adds a black-and-white atmosphere. Rarity badges and item-type icons use surface-specific contrast colors for all six themes; rarity hues and weapon/material shapes retain their original meaning.

Click the atmosphere circles to switch themes directly. The header D20 button opens a numbered 3D die with unbiased 1–20 rolls, a matching forward-facing result, roll/landing chimes, and natural 1/20 accents. Keyboard focus stays in the tray; Escape closes it. Reduced motion shows the result immediately. Dice rolls are independent of card drawing.
