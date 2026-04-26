# EaseUS Vocal Remover Page Clone

This folder contains a static snapshot clone of:

`https://multimedia.easeus.com/ppc/tw/vocal-remover-pro/`

## Structure

- `index.html` (root entry for static hosting)
- `ppc/tw/vocal-remover-pro/...` (mirrored assets and route files)
- `cdn-cgi/...` (downloaded helper script path from source page)

## Deploy (Cloudflare Pages)

1. Set project root to this folder: `easeus-vocal-remover-clone`
2. Build command: leave empty
3. Output directory: `.`
4. Deploy

## Notes

- This is a static clone of the front-end page and assets.
- Added `functions/api/easeus/[[path]].js` as a Cloudflare Pages proxy for API requests.
- The front-end API prefix is adjusted to call `/api/easeus/ppc/vocal-remover/...`, which is forwarded to `https://multimedia.easeus.com/...`.
