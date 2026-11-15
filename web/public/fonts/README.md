<!-- SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md. -->
# Fonts

Self-hosted for the Horizon interface (review note 009). The app loads them from this folder; it
never calls a font CDN.

| File | Family | Weight | Bytes |
|---|---|---|---|
| `barlow-latin-400-normal.woff2` | Barlow | 400 | 22196 |
| `barlow-latin-600-normal.woff2` | Barlow | 600 | 22772 |
| `barlow-condensed-latin-700-normal.woff2` | Barlow Condensed | 700 | 22444 |

Total 67412 bytes (budget: 80 kB).

Source: the npm packages `@fontsource/barlow` 5.3.0 and `@fontsource/barlow-condensed` 5.3.0
(`npm pack` at build time, files copied unchanged from each package's `files/` folder, latin subset
only). Barlow is by Jeremy Tribby, Copyright 2017 The Barlow Project Authors
(https://github.com/jpt/barlow), licensed under the SIL Open Font License 1.1: see `OFL.txt` (the two
packages' licence files, one after the other).
