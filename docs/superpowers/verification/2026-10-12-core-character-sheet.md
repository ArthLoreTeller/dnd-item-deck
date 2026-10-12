# Core character sheet and PDF portrait verification

User requested missing PDF portraits and D&D Beyond sheet functionality, prioritizing saves, attacks, spells, resources, and conditions alongside rests and skills. Implemented on the existing version 1.2 checkout.

## Delivered

- Embedded PDF image candidates, explicit portrait selection, local image upload, persisted raster portraits, and backup roundtrip support. Candidates scan every page and include repeated image operations. No external character-link adapter.
- All 18 skills: unknown / untrained / half proficiency / proficiency / expertise, imported or manual bonus overrides, passive Perception. Six saving throws and initiative/proficiency overrides.
- Skill, saving-throw, and attack D20 rolls with normal, advantage, and disadvantage modes. Unknown bonuses block calculation.
- Short-rest Hit Dice healing, resource recovery, and long-rest HP/all Hit Dice recovery plus exhaustion reduction. Rest actions update the draft; Save character persists it. Resource recovery is configurable and defaults to manual.
- Editable attacks, spells/preparation/concentration requirements, spellcasting ability and basic attack/DC calculation, slot/resource pools, conditions, death saves, Heroic Inspiration, features and proficiencies.
- Section navigation and accessible native controls. Old profiles receive empty sheet defaults. Existing filled import/backup sheet data is retained unless the user explicitly replaces it.

## Verification

- 65 tests passed, production build passed, changed-file lint passed.
- Browser acceptance on separate localhost origin, leaving the user's LAN character form alone: a synthetic AcroForm PDF with an actual embedded RGB image was uploaded through the UI. Extracted portrait was selected, imported, and remained visible after reload.
- Browser short-rest test: current HP 8, CON 14, d8 roll 4 produced HP 14 and consumed one die. Finishing a short rest refilled the configured short-rest resource without autohealing further.
- Browser long-rest test: HP became maximum 20, all three Hit Dice restored, exhaustion decreased from 2 to 1. Saving and reloading retained HP, portrait and sheet values.
- Independent read-only review findings were fixed: empty defaults preventing sheet selection, first-eight-image cutoff, repeated PDF images. No remaining important runtime or compatibility blocker reported.

## Explicit limits

This is a core sheet tracker, not complete D&D Beyond automation. Class/subclass/feat effects, conditional bonuses, attack damage rolls, spell rules, preparation limits, special recovery, altered HP maxima/ability scores and condition effects require manual input/adjudication. Rest eligibility, interruptions and elapsed in-game hours are checked by the player/DM, not a wall-clock timer.

No real user D&D Beyond PDF has been supplied for this work. Portrait acceptance uses a synthetic AcroForm fixture, not proof of every export layout. Image extraction handles RGB/RGBA/bitmap images, bounded to 32 candidates per page, largest 16 overall, source images up to four million pixels and stored portraits under 750,000 characters. Unsupported/absent images can be uploaded separately. PDF attacks, spells, Hit Dice and resource recovery are not inferred from unstructured text. Recognized skills/saves/initiative/features fields import; unsupported values remain blank with review warnings.

Rules checked against the official 2024 Basic Rules glossary: https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary
