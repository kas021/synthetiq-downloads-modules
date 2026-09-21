# Synthetiq Downloads — Modules

Runtime modules for the **Synthetiq Downloads** app. Modules are never bundled
into the app; the app installs them from this repository at runtime:

> Settings → Add modules… → **GitHub** → `kas021/synthetiq-downloads-modules` → Browse catalogue → Install

## Modules

| Module | Version | Identity | SHA-256 |
|---|---|---|---|
| Synthetiq Movies | 1.3.0 | SP-VID-059-SYNTHETIQ-MOVIES | `98af54780d215684a91d678a78f69cb86fbacecbd2f89f821200a4f954c7ec61` |
| Synthetiq Anime | 1.1.0 | SP-VID-074-SYNTHETIQ-ANIME | `a2a1a37101a9fd60dc146eb1f941e8570daec75dd58524ffc011b86b35ab8cdf` |

Both are packaged for the Downloads app with a **downloads-focused discovery
catalogue**: Netflix-style home rows (trending, seasonal, top rated, now
playing, genres — 9–10 rows each), every row paginated for endless scrolling,
and enriched details (backdrop, rating, year, genres, cast) for the app's show
page. Playback / stream-resolution code is unchanged from the owner-approved
builds (Movies 1.2.5, Anime 1.0.2). Flat module archives (`module.json` +
`index.js`, contractVersion 4, contentType `video`).

## Layout

- `catalogue.json` — the module index the app reads
  (`modules[].file` plus `presentation` for the browse list)
- `modules/*.zip` — module archives (superseded versions kept for rollback)
- `assets/module-icons/*` — catalogue icons
- `src/<Module>/` — editable module source (`module.json` + `index.js`)
- `tools/package.sh <Module>` — repackages a source dir into `modules/`

## Development

1. Edit `src/<Module>/index.js` (or `module.json`; bump `moduleVersion`).
2. `bash tools/package.sh <Module>` → new flat ZIP in `modules/`.
3. Smoke-test from the app repo:
   `npx tsx native/tools/module-home-smoke.ts <zip>` (discovery rows, feed
   pagination, details) and
   `npx tsx native/tools/module-stream-smoke.ts <zip> <titleHref> [sub|dub]`
   (stream + size estimate).
4. Update `catalogue.json` (file, changelog) and this README (version, SHA).

## Notes

- The repository is public so the app can read it anonymously
  (`raw.githubusercontent.com`). A private repository cannot be fetched by the
  app without token support, which does not exist yet.
- Module behaviour is the owner's own content — install only what you trust;
  modules run in a sandbox with the Player `fetchv2` contract.
