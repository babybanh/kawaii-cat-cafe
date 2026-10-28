# Browser reliability review — 2026-10-27

## Intent preserved

Preserve staged loading/reveal from 5a53152 and restored high-resolution chef art documented in the asset audit. Do not restore reverted image conversion 859c970. Keep existing input-based audio recovery from 9248759.

## Changes

Start the three opening-art requests in the HTML head without changing the reveal sequence or image pixels. Cancel pending music-gap timers when muted and recheck mute/visibility before a delayed restart.

## Validation

Production build, lint, 8 existing tests; Chromium/WebKit startup, reload, mute/return checks; first recipe served in browser.

Mobile checks used WebKit on macOS with a 390×844 touch viewport. Cold-pickup fixtures position collectibles at the player and run the normal collision/score/audio path. Playback was checked through running audio contexts and started buffers, not recorded speaker output. These are not physical iPhone/Android tests. Occasional long cold frames also occur with SFX off; repeat on a real phone before treating overall frame smoothness as resolved.
