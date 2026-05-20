# Playwright Tutorial Recording

This setup records browser walkthroughs as Playwright test videos.

## Install

```bash
npm install
npx playwright install chromium
```

## Easiest setup

Create a local file named `.env.playwright.local` in the project root:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
PLAYWRIGHT_EMAIL=your-demo-user@example.com
PLAYWRIGHT_PASSWORD=your-demo-password
PLAYWRIGHT_LOCALE=de
```

After that, you can just run:

```bash
npm run record:tutorial
```

## Required environment variables

```bash
export PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
export PLAYWRIGHT_EMAIL="your-demo-user@example.com"
export PLAYWRIGHT_PASSWORD="your-demo-password"
export PLAYWRIGHT_LOCALE=de
```

Use a dedicated demo account so recordings stay stable.

## Record a tutorial

1. Start the app with `npm run dev`
2. Save your credentials once in `.env.playwright.local`
3. Run `npm run record:tutorial`

Videos are written under `recordings/playwright/`.

## Convert to mp4

Playwright records `webm` by default. Convert a clip with:

```bash
ffmpeg -i input.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart output.mp4
```

## Notes

- Keep viewport and zoom unchanged for repeatable recordings.
- Prefer stable demo data over live user content.
- If the sign-in UI changes, update `tests/tutorials/auth.setup.ts` selectors.
- Add more tutorial specs in this folder; each spec produces its own video.