# Synthetiq Downloads — Modules

Runtime modules for the **Synthetiq Downloads** app. Modules are never bundled
into the app; the app installs them from this repository at runtime:

> Settings → Add modules… → **GitHub** → `kas021/synthetiq-downloads-modules` → Browse catalogue → Install

## Modules

| Module | Version | Identity | SHA-256 |
|---|---|---|---|
| Synthetiq Movies | 1.2.5 | SP-VID-059-SYNTHETIQ-MOVIES | `f48fa9a64489db1b92487b92b6e33c3e07fa3ce452ed4096187f3ea40c327208` |
| Synthetiq Anime | 1.0.2 | SP-VID-074-SYNTHETIQ-ANIME | `73c1d6b7f3ee6369d07c1b9e385334fa8b4c8a7b8167787a6d4827c4d2e96acc` |

Both are the same approved bytes as the Synthetiq Player public catalogue,
packaged here for the Downloads app. Flat module archives
(`module.json` + `index.js`, contractVersion 4, contentType `video`).

## Layout

- `catalogue.json` — the module index the app reads
  (`modules[].file` plus `presentation` for the browse list)
- `modules/*.zip` — module archives
- `assets/module-icons/*` — catalogue icons

## Notes

- The repository is public so the app can read it anonymously
  (`raw.githubusercontent.com`). A private repository cannot be fetched by the
  app without token support, which does not exist yet.
- Module behaviour is the owner's own content — install only what you trust;
  modules run in a sandbox with the Player `fetchv2` contract.
