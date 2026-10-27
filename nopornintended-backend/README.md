# nopornintended Backend

Django REST backend for the `nopornintended` React frontend.

This README is the running backend setup log. Each step should be checked off as it is completed so the project history stays clear.

## Current Status

- Frontend folder: `../nopornintended-frontend`
- Backend folder: `../nopornintended-backend`
- Backend framework: Django + Django REST Framework
- Current database: Supabase Postgres through `DATABASE_URL`
- Admin content management: Django Admin first, custom dashboard later if needed

## Setup Checklist

- [x] Step 1: Create `nopornintended-backend` beside `nopornintended-frontend`.
- [x] Step 2: Confirm Python is available for backend setup.
- [x] Step 3: Create the Python virtual environment.
- [x] Step 4: Install Django backend dependencies.
- [x] Step 5: Freeze dependencies into `requirements.txt`.
- [x] Step 6: Create the Django project.
- [x] Step 7: Create backend apps for videos, pages, and submissions.
- [x] Step 8: Configure Django settings for REST API, CORS, media files, and local development.
- [x] Step 9: Create database models and register them in Django Admin.
- [x] Step 10: Build serializers, API views, and URL routes.
- [x] Step 11: Run migrations and test local API endpoints.
- [ ] Step 12: Connect the React frontend to the backend API.
- [x] Step 13: Add Supabase Storage configuration.
- [x] Step 14: Prepare Render deployment settings.
- [x] Step 15: Switch the database from local SQLite to Supabase Postgres.

## Planned API Endpoints

These are the first backend endpoints planned for the current frontend and near-term pages.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/videos/` | Homepage video grid. |
| `GET` | `/api/videos/<id>/` | Single video detail for `/downloads/:id`. |
| `GET` | `/api/videos/<id>/related/` | Related videos for the download page. |
| `GET` | `/api/categories/` | Navigation/category data. |
| `GET` | `/api/videos/search/?q=<term>` | Navbar search. |
| `POST` | `/api/videos/<id>/view/` | Track video views. |
| `POST` | `/api/videos/<id>/download/` | Track downloads and return video download data. |
| `GET` | `/api/pages/<slug>/` | Static pages such as terms, privacy, DMCA, contact. |
| `POST` | `/api/contact/` | Contact form submissions. |
| `POST` | `/api/reports/` | DMCA/report content submissions. |

## Admin Workflow

For bulk copying existing Supabase videos and updating their links, follow
[the Bunny migration guide](BUNNY_MIGRATION.md). The command defaults to a
database-only preview and keeps the Supabase originals on apply.

For the first version, content is managed through Django Admin instead of a custom frontend dashboard.

Admin users will be able to:

- Add, edit, publish, unpublish, and delete videos.
- Add video files or external video URLs.
- Add thumbnails, descriptions, categories, duration, and metadata.
- Manage categories and static pages.
- Review contact messages and content reports.
- See view/download tracking records.

Later, a custom admin dashboard can be added if the project needs a more branded or specialized workflow.

### Same-person related videos

Deploy migration `videos.0003_performer_video_performer` with `python manage.py migrate`. In Django Admin, add public/stage names under **Videos → People**, then select the same **Person** for every video featuring that person. The Person column on the videos list is editable for assigning existing videos; remember to save the list. The field is also available on each video's edit form, including an add-person shortcut. Each video has one primary person for grouping.

`GET /api/videos/<id>/related/` gives an assigned person priority: it returns only that person's other published videos, newest first, regardless of category. If no person is assigned, it returns other published videos with the same category first, then remaining videos by newest publication date. Without a category, the fallback uses newest videos. The current video and unpublished videos are always excluded. An assigned person without other matching videos has an empty result. Existing content is left unassigned until an admin selects a person; names are never inferred from titles or images. Deleting a person clears the assignment, preserves their videos, and restores the category/recent fallback.

The endpoint supports `page` and `page_size` using the same pagination as the library; requests without pagination parameters retain the legacy array response. Video list and detail responses include `performer: {id, name}` or `null`.

## Local Development Notes

The backend now uses Supabase Postgres when `DATABASE_URL` is present in `.env`. To temporarily return to local SQLite, comment out `DATABASE_URL` and restart Django.

Expected local backend URL:

```text
http://127.0.0.1:8000/
```

Expected local admin URL:

```text
http://127.0.0.1:8000/admin/
```

Expected local API base URL:

```text
http://127.0.0.1:8000/api/
```
## Step 11 Testing Checkpoint

Reached Step 11 on 2026-10-08.

Completed before testing:

- Django migrations were created.
- Local SQLite database tables were created.
- `python manage.py check` passed with no issues.

Pending before Step 11 can be checked off:

- [x] Start the local Django server.
- [x] Open and verify the API root.
- [x] Open and verify Django Admin login.
- [x] Verify list endpoints return valid JSON.
- [x] Add at least one video through Django Admin or shell.
- [x] Verify detail, related, view tracking, and download tracking endpoints.

Do not move to Step 12, frontend API connection, until these tests pass.
Step 11 test results:

- `GET /api/` returned the API root JSON.
- `GET /api/categories/` returned the created category.
- `GET /api/videos/` returned the created video.
- `GET /api/videos/1/` returned video detail JSON.
- `GET /api/videos/1/related/` returned valid JSON. It is empty for now because only one video exists.
- `GET /api/videos/search/?q=<title>` returned the created video.
- `POST /api/videos/1/view/` created a view event and incremented views.
- `POST /api/videos/1/download/` created a download event and incremented downloads.
- `GET /api/pages/terms/` returned a test static page.
- `POST /api/contact/` created a test contact message.
- `POST /api/reports/` created a test content report.

Step 11 is complete. The next stage is Step 12: connect the React frontend to these backend APIs.
## Step 12 Frontend Verification Notes

Checked on 2026-10-09.

Frontend verification passed:

- Homepage video grid now uses `GET /api/videos/`.
- Category navigation now uses `GET /api/categories/`.
- Category filter uses `GET /api/videos/?category=<slug>`.
- Search page uses `GET /api/videos/search/?q=<term>`.
- Download/detail page uses `GET /api/videos/<id>/`.
- Related videos use `GET /api/videos/<id>/related/`.
- Video detail page tracks views with `POST /api/videos/<id>/view/`.
- Download button tracks downloads with `POST /api/videos/<id>/download/`.
- No active frontend source imports `mockVideos` anymore.
- Frontend build passed with local Vite binary.
- Frontend lint passed with local ESLint binary.

Pending before Step 12 is complete:

- Add frontend routes/pages for `/terms` and `/privacy` using `GET /api/pages/<slug>/`.
- Add frontend route/page for `/contact` using `POST /api/contact/`.
- Add frontend route/page for `/report` using `POST /api/reports/`.
- Decide what to do with `/forum`, because the footer links to it but no backend or frontend route exists yet.
- Fix or reinstall the global `npm` command on the machine. The local project binaries work, but `npm run build` and `npm run lint` currently fail because the global npm shim points to a missing npm CLI.

Step 12 should stay unchecked until the missing frontend routes are added or intentionally removed from the UI.
## Step 13 Supabase Storage Notes

Started on 2026-10-09.

Completed locally:

- Installed `django-storages` and `boto3`.
- Added `storages` to Django `INSTALLED_APPS`.
- Added `USE_SUPABASE_STORAGE` settings switch.
- Added Supabase S3-compatible media storage settings behind environment variables.
- Updated `.env.example` with placeholder Supabase Storage variables.
- Refreshed `requirements.txt`.
- `python manage.py check` passes.

Current external checkpoint:

- Supabase `media` bucket exists and is public.
- Django reads the bucket, endpoint, region, access key, and secret key from `.env`.
- Direct S3 upload/list requests currently return Supabase `400 Bad Request`.
- Before testing uploads again, verify in Supabase that S3 protocol is enabled and saved, and that the access key/secret in `.env` exactly match the generated S3 access key.
REST fallback added:

- Added `config.storage_backends.SupabaseRestStorage` for Supabase Storage's REST API.
- Set `SUPABASE_STORAGE_DRIVER=rest` to use the REST backend.
- REST backend requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
- Do not expose the service-role key in frontend code or chat.
- Correct REST public media URL format is `https://PROJECT_REF.supabase.co/storage/v1/object/public/media`.
- `python manage.py check` passes with the REST storage backend enabled.
- Corrected the project ref in `.env` to `bxxsschlasvlqufqdpqj`.
- Verified DNS for `bxxsschlasvlqufqdpqj.supabase.co`.
- Verified Django Supabase REST storage by uploading and deleting `healthchecks/codex-storage-test.txt`.
- Verified a real video can be uploaded from Django Admin and returned by `GET /api/videos/` with a Supabase public media URL.

Step 13 status: complete for Supabase Storage. The database was later switched to Supabase Postgres in Step 15.

## Step 14 Render Deployment Notes

Started and completed locally on 2026-10-09.

Completed locally:

- Installed `gunicorn` for the production WSGI server.
- Installed `whitenoise` for serving Django Admin/static assets on Render.
- Added `whitenoise.middleware.WhiteNoiseMiddleware` after Django's `SecurityMiddleware`.
- Added production static file storage with `CompressedManifestStaticFilesStorage` when `DEBUG=False`.
- Added backend `build.sh` for Render builds.
- Added root `../render.yaml` for the two-folder monorepo layout.
- Render build command is `bash build.sh`.
- Render pre-deploy command is `python manage.py migrate`.
- Render start command is `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`.
- Render health check path is `/api/`.

Production environment variables needed on Render:

- `SECRET_KEY`
- `DEBUG=False`
- `ALLOWED_HOSTS=nopornintended-backend.onrender.com`
- `DATABASE_URL`
- `USE_SUPABASE_STORAGE=True`
- `SUPABASE_STORAGE_DRIVER=rest`
- `SUPABASE_URL=https://bxxsschlasvlqufqdpqj.supabase.co`
- `SUPABASE_STORAGE_BUCKET=media`
- `SUPABASE_STORAGE_PUBLIC_URL=https://bxxsschlasvlqufqdpqj.supabase.co/storage/v1/object/public/media`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`

Do not put secret values in source control. Set them in Render's environment variable UI or as unsynced Blueprint values.

## Step 15 Supabase Postgres Notes

Started on 2026-10-09.

Completed locally:

- Installed `psycopg` and `psycopg-binary` for PostgreSQL support.
- Django now uses local SQLite when `DATABASE_URL` is empty.
- Django switches to Supabase Postgres automatically when `DATABASE_URL` is set.
- PostgreSQL connections default to `sslmode=require`.
- `DATABASE_CONN_MAX_AGE=0` and `DATABASE_DISABLE_SERVER_SIDE_CURSORS=True` are documented for pooler-friendly defaults.

Completed external checkpoint:

- Added Supabase transaction-pooler URI to local `.env` as `DATABASE_URL`.
- Verified Django parses the database as PostgreSQL with `sslmode=require`.
- Ran all migrations against Supabase Postgres.
- Exported existing local SQLite data to a temporary fixture.
- Loaded 18 existing objects into Supabase Postgres, including the existing admin user, categories, video, pages, submissions, and tracking events.
- Removed the temporary data fixture after import.
- Restarted the local Django server so it reads from Supabase Postgres.
- Verified `GET /api/videos/` returns the existing video from the Postgres-backed server.

Step 15 status: complete. Existing Django Admin credentials should continue to work because the local admin user was copied into Supabase Postgres.
