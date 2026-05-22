# Privacy Policy for Task Compass for Google Tasks

Last updated: May 22, 2026

Task Compass for Google Tasks is a Chrome extension that helps users view and organize Google Tasks in an Eisenhower Matrix.

## Data Access

Task Compass requests access to Google Tasks so it can:

- load your Google task lists
- load incomplete tasks from the selected task list
- display task titles and due dates in the matrix
- mark tasks as completed when you choose to complete them
- organize tasks into urgency and importance quadrants

Task Compass uses the following Google OAuth scope:

```text
https://www.googleapis.com/auth/tasks
```

This scope is required because the extension needs to read Google Tasks data and update task completion status.

## Data Storage

Task Compass stores a limited amount of extension data in Chrome storage:

- selected Google Tasks list id
- task ids and task list ids for tasks you manually classify
- urgency and importance metadata for those tasks
- timestamps for when classification metadata was updated
- temporary OAuth access token used to call the Google Tasks API

Task classification metadata is stored using `chrome.storage.sync` so your matrix organization can sync across Chrome browsers where you are signed in. OAuth token data is stored using `chrome.storage.local`.

Task Compass does not store your Google Tasks data on any server controlled by the developer.

## Data Sharing

Task Compass does not sell, rent, share, or transfer your data to third parties.

The extension communicates only with Google services needed for authentication and Google Tasks functionality.

## Analytics And Tracking

Task Compass does not use analytics, advertising, tracking pixels, or behavioral tracking.

## Use Of Google API Data

Task Compass uses information received from Google APIs only to provide the extension's task management functionality.

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Data Retention And Deletion

Task classification metadata remains in Chrome storage until you remove it by uninstalling the extension, clearing extension storage, or clearing synced Chrome data.

Your Google Tasks remain in your Google account. Task Compass does not delete tasks. When you mark a task complete, the extension updates that task's status in Google Tasks.

You can disconnect Google from the extension to remove the cached OAuth token and request token revocation. You can also revoke the extension's Google access at any time from your Google Account permissions page.

## Security

Task Compass communicates with Google APIs over HTTPS. OAuth tokens are stored using Chrome extension storage and are used only to authorize requests to Google Tasks.

## Contact

For questions about this privacy policy, contact:

```text
pkritiotis@gmail.com
```
