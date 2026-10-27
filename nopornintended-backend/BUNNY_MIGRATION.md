# Bulk migration of existing video files to Bunny

This command copies Supabase video files and updates their existing Django
records. It does not delete Supabase objects, change IDs or social statistics,
or change where new Django-admin uploads are stored. Thumbnails and unreferenced
bucket objects are outside its scope. Continue uploading future videos in Bunny
and using the **Video URL** field in Django admin.

## 1. Configure the backend .env

Keep the existing Supabase configuration, including `USE_SUPABASE_STORAGE=True`.
Add these settings to `nopornintended-backend/.env` (edit existing entries rather
than adding duplicates):

```dotenv
BUNNY_STORAGE_ZONE=nopornintended-videos
BUNNY_STORAGE_ENDPOINT=https://storage.bunnycdn.com
BUNNY_STORAGE_PASSWORD="YOUR_STORAGE_ZONE_PASSWORD"
BUNNY_CDN_URL=https://nopornintendedvideos.b-cdn.net
BUNNY_TRANSFER_TIMEOUT=600
```

Use the first **Password** under Bunny **Storage > nopornintended-videos > Access
> API / HTTP**. The read-only password cannot upload. This is a storage-zone
credential, not the global account API key. Keep the real value private and out
of Git. The endpoint above is for Frankfurt; it excludes the zone name because
the command appends it. No account API access or new S3 configuration is needed.

Reference: [Bunny's HTTP storage documentation](https://bunny.net/docs/storage/http/).

## 2. Activate the virtual environment and preview

Open a separate PowerShell terminal; the development servers can stay running.

```powershell
cd C:\projects\nopornintended\nopornintended-backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate_videos_to_bunny
```

Without `--apply`, this only reads the database and lists eligible video IDs and
source paths. It performs no storage requests, file transfers, report creation
or database updates. Published and unpublished videos are included. Existing
Bunny/external video URLs are skipped. URLs in the configured Supabase public
bucket are also supported when no uploaded-file reference exists.

The command uses the database configured by this `.env`, which may be your live
Supabase database even when launched on your laptop. The preview count is the
number of eligible records, not a byte-size or cost estimate.

## 3. Migrate one video and check it

```powershell
python manage.py migrate_videos_to_bunny --apply --limit 1
```

The command prints the processed video ID. Open that entry in Django admin or
the website (`/downloads/<id>`) and test playback, seeking and Download.

Before changing a link, the command downloads one source to a temporary disk
file, uploads raw bytes with a SHA-256 checksum, reads the Bunny object back to
verify size and hash, and probes the CDN for correct range data and public CORS.
Files are not re-encoded. Each video uses a path under
`migrated/videos/<id>/<sha256>.<extension>` to avoid name collisions and long URLs.
The temporary disk file is closed and removed after each attempt. Have enough
free local disk space for your largest video, and keep the terminal running.

## 4. Migrate the remainder

```powershell
python manage.py migrate_videos_to_bunny --apply
```

Successfully migrated entries are skipped on later runs. Verified copies left
by an interruption are reused. Temporary errors are retried twice per video;
failed records retain their original references and other records can continue.
The command reports a failure exit status if any entries need attention. An
admin edit during a transfer is preserved instead of being overwritten.

To select particular records, add `--ids 12 17`. `--limit 5` limits the number
of eligible videos attempted. Transfers pass through your computer and use
provider bandwidth/storage allowances; copying cannot bypass a Supabase access
or quota restriction. Restore source access if it is blocked.

### If Supabase returns HTTP 402

Supabase uses 402 for service restrictions such as exceeded quotas or overdue
billing. The download is blocked before a Bunny upload starts. The command
stops the batch at that point, keeps the database references, and does not
automatically retry the restriction.

Check the organization's Usage/Billing notice for the exact reason. If the
originals exist only in Supabase, ask Supabase support about temporary export
access or another supported recovery route. Availability or a fee waiver cannot
be guaranteed. Do not delete the originals to try to unlock the account.
Once source access is restored, rerun the one-video test. Restoring access does
not require changing the Bunny password or creating replacement Django records.

Reference: [Supabase HTTP status codes](https://supabase.com/kb/troubleshooting/http-status-codes).

## Recovery and cleanup

Each apply run saves a private JSONL recovery report in `migration-reports/`,
which is ignored by Git. A verified record's original file and URL references
are flushed to disk **before** its database update. Keep these reports: they map
video IDs and source objects to their replacements. A report entry labelled
`verified_before_update` alone does not prove the database switch completed;
check that record after an interrupted run.

Only the media references and `updated_at` are updated. Titles, categories,
people, publication status, views, reactions, comments and downloads are kept.
There is no automatic source deletion or automatic rollback. Do not delete old
Supabase objects until replacements have been checked and independent backups
are available. Other entries may reference the same source object. Changing
database links alone does not reclaim Supabase storage.

## Development checks

Use isolated settings; never run tests against the production database:

```powershell
python manage.py test --settings=config.test_settings
```

Migration tests mock storage requests and cover checksums, truncated responses,
retry/resume, unchanged metadata, concurrent admin edits, source preservation,
credential handling, and default preview behavior.
