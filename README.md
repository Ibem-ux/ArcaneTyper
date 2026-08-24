# ArcaneTyper

> A typing game staged as wizardry — defend an enchanted library from word
> waves, grow your mage, and duel other typists in real time.

**Play now:** [arcane-typer.vercel.app](https://arcane-typer.vercel.app)

<!-- Screenshot placeholder: capture the start menu or a live survival run,
     save as docs/screenshot.png, then uncomment:
![ArcaneTyper gameplay](docs/screenshot.png)
-->

## Game modes

- **Arcane Defense (Survival)** — words spawn as incoming threats; type them
  down before they breach your barriers. Score, combo multipliers and mana
  for a Nova spell are all in play.
- **The Scribe's Trial (Practice)** — pure typing measurement: WPM, raw WPM,
  accuracy and consistency, with a WPM-over-time graph at the end. Word and
  timed variants.
- **The Arena (Duels)** — real-time mage duels. Host a room, share the
  6-digit code, and race an opponent's live score/WPM/barriers on a 90-second
  clock.

## Depth

- **The Workshop** — spend XP in three talent trees (Scholar, Pyromancer,
  Oracle) and equip wand styles.
- **Hall of Fame** — per-difficulty leaderboards across score, speed and
  accuracy boards.
- **Trophy Room** — unlockable achievements and mage titles.
- **Spellbooks** — two word packs: Classic (English) and Incantation
  (coding terms).
- Difficulty ladder from Novice to Cataclysm, plus Chaos (scrambled) and
  Blind (hidden text) modifiers.

## Tech

| Layer      | Choice                                            |
|------------|---------------------------------------------------|
| Frontend   | JavaScript SPA built with Vite                    |
| Backend    | Supabase — accounts, scores, duels                |
| Charts     | Chart.js                                          |

## Run locally

Prerequisites: Node.js 18+ and a free [Supabase](https://supabase.com)
project.

```bash
git clone https://github.com/IbemCabahug/ArcaneTyper
cd ArcaneTyper/frontend
npm install
cp ../.env.example .env   # then fill in your Supabase values
npm run dev
```

### Configuration

Copy `.env.example` to `.env` (frontend root) and set:

| Variable                 | Description                              |
|--------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`      | Your Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) key    |

## Building for production

```bash
npm run build    # outputs to dist/
npm run preview  # serve the build locally
```
