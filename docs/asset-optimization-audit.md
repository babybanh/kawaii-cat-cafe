# Kawaii Cat Cafe Asset Optimization Audit

## Current Footprint

- `public/assets`: about 37 MB across 35 files.
- Largest groups:
  - `public/assets/recipes`: about 12 MB.
  - `public/assets/ingredients`: about 10 MB.
  - `public/assets/backgrounds`: about 9.5 MB.
  - `public/assets/characters`: about 2.3 MB.
  - `public/assets/audio`: about 1.1 MB.

## Largest Individual Files

- `public/assets/backgrounds/kawaii-bakery-clean-stage.png`: 2.7 MB.
- `public/assets/backgrounds/kawaii-table-foreground.png`: 2.1 MB.
- `public/assets/backgrounds/kawaii-bakery-table.png`: 2.1 MB.
- `public/assets/background.png`: 2.1 MB.
- `public/assets/backgrounds/kawaii-room-layer.png`: 1.8 MB.
- `public/assets/recipes/cookie/sugar.png`: 1.3 MB.
- `public/assets/ingredients/milk.png`: 1.3 MB.
- `public/assets/recipes/soda/soda.png`: 1.2 MB.
- `public/assets/recipes/soda/ice.png`: 1.2 MB.
- `public/assets/audio/kawaii-cat-cafe-score.mp3`: 1.1 MB.

## Recommended Next Optimizations

- Convert painted RGB backgrounds to WebP or AVIF first. Best candidates are `kawaii-room-layer.png`, `kawaii-bakery-clean-stage.png`, `kawaii-bakery-table.png`, and possibly `background.png` if it is still needed.
- Keep transparent art as either optimized PNG or WebP with alpha. Best candidates are ingredients, recipe layers, characters, `kawaii-table-foreground.png`, and `gametitle.png`.
- Downscale ingredient and recipe-layer sources before conversion. Most are 1254 by 1254 pixels but render much smaller in-game, so 512-768 pixel variants should be visually safe to test.
- Downscale `gametitle.png`. It is 1672 by 941 pixels but appears as a wall title, so a smaller alpha image should preserve the look with much less weight.
- Keep music lazy-loaded. The current MP3 size is acceptable for now, but it should not block first play.
- Confirm whether `public/assets/background.png` is unused before deleting. It does not appear in the current app references.
- The app no longer uses the older CSS fallback references to `kawaii-bakery-clean-stage.png` or `kawaii-bakery-table.png`, which prevents those large legacy backgrounds from being requested during normal play.

## Implementation Note

This pass does not convert or delete assets. It adds a loading gate where the background and Mochi are prioritized for the loading screen, Yuto and Akari are revealed together afterward, and future recipe/concept art is deferred so the existing design stays stable while we measure the next compression step.

## 2026-05-19 Safe Optimization Test

- Replaced character, ingredient, and recipe-layer PNGs with downscaled optimized PNG copies, preserving alpha and existing file paths.
- Switched `kawaii-room-layer` and `gametitle` to optimized WebP copies and removed the replaced PNG files because no runtime code references them.
- Left `kawaii-table-foreground.png` unchanged because the available optimized table background is not alpha-safe for that foreground layer.
- Left legacy unused backgrounds in place for a separate cleanup pass.

## 2026-05-19 Character Quality Adjustment

- Restored Akari and Yuto to their original 1086 by 1448 transparent PNG sources so the full-body characters remain crisp on larger monitors.
- Kept the rest of the optimized asset pass in place because ingredients, recipe layers, and backgrounds carry the larger first-load savings.
