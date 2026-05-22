# Store Assets

Chrome Web Store assets for Task Compass for Google Tasks.

## Generated Files

- `../public/icons/icon-16.png`
- `../public/icons/icon-48.png`
- `../public/icons/icon-128.png`
- `icon-128.png`
- `screenshots/01-prioritize-google-tasks.png`
- `screenshots/02-drag-to-prioritize.png`
- `screenshots/03-complete-and-refresh.png`
- `promotional/small-promo-440x280.png`
- `promotional/marquee-1400x560.png`

## Source Files

- `source/store-assets.html`: visual source for screenshots and promotional images.
- `source/generate-icons.mjs`: deterministic PNG icon generator.
- `source/icon.svg`: vector reference for the icon mark.

## Regenerate Icons

```bash
node store-assets/source/generate-icons.mjs
```

Use `icon-128.png` as the Chrome Web Store extension icon upload. The SVG in `source/icon.svg` is only the editable source reference.

## Regenerate Screenshots And Promo Images

Start the local Vite server:

```bash
npm run dev -- --port 5179
```

Open:

```text
http://127.0.0.1:5179/store-assets/source/store-assets.html
```

Render each named asset element at its exact dimensions.
