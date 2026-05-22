# Task Compass for Google Tasks

Chrome MV3 extension that opens Task Compass, an Eisenhower Matrix companion for Google Tasks, in the browser side panel.

## OAuth setup

This extension uses `chrome.identity.launchWebAuthFlow` so it can work in Chromium-based browsers that do not support Google's `chrome.identity.getAuthToken` flow reliably.

Create the OAuth client in Google Cloud Console as:

- Application type: **Web application**
- Authorized redirect URI:

```text
https://<extension-id>.chromiumapp.org/oauth2
```

You can get `<extension-id>` from `chrome://extensions` after loading the unpacked `dist` folder.

Then put the Web application client ID in `public/manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_WEB_APPLICATION_CLIENT_ID.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/tasks"]
}
```

Enable the Google Tasks API in the same Google Cloud project.

## Development

```bash
npm install
npm run build
```

Load the unpacked extension from:

```text
dist
```

After changing `public/manifest.json`, run `npm run build` and click **Reload** for the extension in `chrome://extensions`.
