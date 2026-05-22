# Task Compass for Google Tasks

Task Compass is a Chrome side panel extension that turns a Google Tasks list into an Eisenhower Matrix. It helps you sort incomplete tasks by urgency and importance, then act on them without leaving the browser.

## Features

- View incomplete tasks from any Google Tasks list in a four-quadrant matrix.
- Drag tasks between **Do**, **Schedule**, **Delegate**, and **Eliminate**.
- Treat tasks due today or overdue as urgent by default.
- Remember manual urgency and importance choices with `chrome.storage.sync`.
- Mark tasks complete from the matrix and sync that status back to Google Tasks.
- Disconnect Google from the extension and request OAuth token revocation.
- Keep task data local to the extension and Google APIs, with no analytics or third-party tracking.

## How It Works

The extension runs as a Manifest V3 Chrome extension. The action button opens the side panel, where Task Compass authenticates with Google, loads task lists through the Google Tasks API, and displays the selected list as a matrix.

Task text and completion status stay in Google Tasks. Task Compass stores only the selected list and matrix classification metadata in Chrome storage so your quadrant choices can sync across Chrome profiles.

## Requirements

- Node.js 20 or newer
- npm
- Chrome or another Chromium-based browser with side panel support
- A Google Cloud project with the Google Tasks API enabled

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build the extension:

```bash
npm run build
```

For fast UI iteration outside the extension shell, run Vite:

```bash
npm run dev
```

## Google OAuth Setup

Task Compass uses `chrome.identity.launchWebAuthFlow` instead of `chrome.identity.getAuthToken` so the extension works reliably across Chromium-based browsers.

In Google Cloud Console:

1. Enable the **Google Tasks API**.
2. Create an OAuth client with application type **Web application**.
3. Add this authorized redirect URI:

```text
https://<extension-id>.chromiumapp.org/oauth2
```

You can find `<extension-id>` at `chrome://extensions` after loading the unpacked `dist` folder.

Then set the OAuth client ID in `public/manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_WEB_APPLICATION_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/tasks"]
}
```

The OAuth client ID is not a secret, but forks and local development builds should use their own Google Cloud OAuth client because the redirect URI depends on the extension ID.

After changing `public/manifest.json`, rebuild the extension:

```bash
npm run build
```

## Loading The Extension Locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the generated `dist` folder.
5. Pin or click the extension action to open Task Compass in the side panel.

When you change source files, run `npm run build` again and click **Reload** for the extension in `chrome://extensions`.

## Privacy

Task Compass requests the Google Tasks OAuth scope:

```text
https://www.googleapis.com/auth/tasks
```

This lets the extension read task lists, read incomplete tasks, and mark tasks complete when you choose to do so. The extension does not run analytics, advertising, or behavioral tracking.

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Project Structure

```text
src/domain/              Core task classification and metadata logic
src/infrastructure/      Chrome storage and OAuth integration
src/sidepanel/           React side panel UI
public/manifest.json     Chrome extension manifest
store-assets/            Chrome Web Store listing assets and source files
```

## Scripts

```bash
npm run build       # type-check and build the extension into dist/
npm test            # run the Vitest suite
npm run test:watch  # run tests in watch mode
npm run dev         # start the Vite dev server for UI work
```

## License

Choose and add an open-source license before accepting external contributions. Until a license is added, all rights are reserved by default.
