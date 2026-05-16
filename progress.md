Original prompt: Convert the cooking game into a single square bakery table stage with the background behind all UI, absolute-positioned recipe/prep/character/cat/ingredient zones, invisible ingredient hit zones, and ingredient PNG drag previews.

Progress:
- Added the bakery table background at `public/assets/backgrounds/kawaii-bakery-table.png`.
- Collapsed the page into one square `.game-stage` with the bakery table as the CSS background behind all gameplay UI.
- Repositioned the recipe checklist, prep area, character panel, Mochi, and ingredient layer as absolute children of the stage.
- Replaced visible table ingredient art with transparent drag/click hit zones and ingredient PNG drag previews.
- Added the clean composite stage background at `public/assets/backgrounds/kawaii-bakery-clean-stage.png`.
- Removed the visible score/header and speech bubble from normal play.
- Replaced the always-open recipe panel with a recipe-book tab and drawer.
- Restored all 12 ingredient PNGs as visible draggable table stickers.
- Added freestanding Yuto/Akari stickers, centered Mochi on the paw pillow, and kept scoring state internal.

TODO:
- Browser DOM/screenshot check passed: no old header/speech/score UI, 12 visible ingredients, recipe drawer opens, and the clean background is behind the game.
- Click-flow QA passed for all four recipes, wrong-ingredient rejection, and Mochi pet gating after the third order.
- `npm run build`, `npm run lint`, and `npm test` passed after the clean-stage changes.

- Paper-theater refactor in progress: generated separate room/table layer assets, rewired the React tree into explicit scene layers, enlarged chefs behind the table layer, moved the recipe checklist into a pinned note, and shifted prep/ingredients/Mochi into stage layers.

- Completed paper-theater refactor: added generated room/table foreground assets, layered scenery, large chefs behind the counter, pinned recipe note, tabletop ingredients, foreground Mochi, minimal score/title, and optional edit mode with drag/resize/copy/reset. QA: npm run build, npm run lint, npm test, and Playwright recipe/edit-mode smoke test passed.

- Replaced all 24 ingredient and recipe-layer PNGs with the May15 updated artwork set from `~/Downloads/Kawaii Cat Cafe - Images May15`. Verified every replacement is 1254x1254. QA: `npm run build`, `npm run lint`, `npm test`, Browser screenshot check, and web-game smoke screenshot passed.

- Implemented coded-in approved layout defaults, split prep into editable prep art/hit/hint/finish targets, raised art scale max to 5, fixed ingredient wiggle/shake to preserve image scale, centered Mochi click behavior, and added a 3-heart Mochi mood gate. QA: `npm run build`, `npm run lint`, `npm test`, Browser DOM/console/screenshot checks, edit-target visibility, and three-recipe Mochi mood flow passed.
