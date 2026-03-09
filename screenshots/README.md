# App Store Screenshot Workflow

This project includes an automated screenshot resizer for App Store Connect.

## 1) Add raw screenshots

Put your base screenshots here:

- `screenshots/raw/iphone/` (required)
- `screenshots/raw/ipad/` (optional, if missing it falls back to iPhone sources)

Use PNG or JPG files. Files are sorted by filename and exported in that order.

## 2) Generate resized outputs locally

```bash
npm run screenshots:generate
```

Generated files are written to:

- `screenshots/app-store/iphone-6.9/` (1320x2868)
- `screenshots/app-store/iphone-6.5/` (1242x2688)
- `screenshots/app-store/ipad-13/` (2064x2752)
- `screenshots/app-store/ipad-12.9/` (2048x2732)

## 3) Generate in GitHub Actions

Run workflow: `Generate App Store Screenshots`

- Upload raw files to `screenshots/raw/**` and push, or
- trigger manually via workflow dispatch.

Download artifact `app-store-screenshots` and upload folders to matching size buckets in App Store Connect.
