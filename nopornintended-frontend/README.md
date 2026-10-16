# nopornintended frontend

React, React Router, and Vite frontend with shared responsive CSS.

## Run locally

Use a Node version supported by the installed Vite release. This project was verified with Node 22.19.

```sh
npm ci
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` to your Django API URL, including `/api`. See `.env.example`. Restart Vite after changing environment variables. The frontend does not require private backend credentials.

## Checks

```sh
npm run lint
npm test
npm run format:check
npm run build
```

The frontend tests cover API response shapes, validation, cancellation, URL handling, and download filenames. Backend API tests use an isolated SQLite database:

```sh
# From nopornintended-backend, using its Python environment:
python manage.py test --settings=config.test_settings
```

## Features

- Responsive library, category navigation, mobile search, sorting, duration filters, and pagination.
- Uploaded thumbnails take priority. Missing or broken images fall back to a paused video frame automatically, loaded near the viewport with at most three preview requests in progress. These previews do not play audio or count as views. Unplayable files retain the unavailable-preview state.
- Device-local saved videos, up to 500. Clearing this browser's storage removes this collection; no account or cross-device sync is included.
- One changeable thumbs-up/down reaction per anonymous browser identity and video. Counts are stored by the backend. This is not verified-person voting; resetting browser storage creates a new identity.
- Video comments with server-side validation and approval in Django Admin. Only approved comments are public.
- Contact and report forms. Messages and reports are available in Django Admin.
- Terms and Privacy pages displaying published plain-text `StaticPage` records with the slugs `terms` and `privacy`.
- Age confirmation on library, search, saved, and video routes. Policies, contact, and reports remain accessible without entering the video library.

Video views are counted when playback starts. Downloads can use a direct-file fallback when storage CORS prevents a browser download.

## Backend deployment

Deploy the updated backend alongside this frontend and run:

```sh
python manage.py migrate
```

Migration `videos.0002_video_feedback_and_duration` adds reactions, moderated comments, and indexed duration values; it also backfills existing durations. Enter future durations as `M:SS` or `H:MM:SS`. Unknown durations are excluded when an explicit duration filter is selected.

Publish the `terms` and `privacy` pages in Django Admin, and approve comments under **Video comments**. Configure the backend's CORS origins for the frontend domain and media storage CORS for downloads. Anonymous rate limits use Django's configured cache; use a shared cache when deploying multiple backend workers.

## Isolated browser preview

The preview uses harmless sample media and an in-memory database. Its submissions never reach the production API. It uses a component fixture in place of age confirmation only in this separate test configuration; the production build includes the real gate.

```sh
# Terminal 1, from nopornintended-backend:
python tools/preview_server.py

# Terminal 2, from nopornintended-frontend:
npm run dev -- --config tests/preview.config.js
```

Open `http://127.0.0.1:5174/`. The sample data disappears when the preview backend stops. The normal app uses port 5173 and your configured API.
