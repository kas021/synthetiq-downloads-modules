# Synthetiq Downloads Modules

Data-only source definitions for Synthetiq Downloads. Sources are explicitly installed by the user; a fresh app does not include this repository.

## Install or update

In Downloads, open **Settings → Modules & Sources → Add module**, paste this link and choose **Install**:

```text
https://github.com/kas021/synthetiq-downloads-modules
```

Direct catalogue URL:

```text
https://raw.githubusercontent.com/kas021/synthetiq-downloads-modules/main/catalogue.json
```

Compatible entries install automatically. For existing installations, use the module's update/check action. Do not delete downloads or reinstall the app to update a definition.

## 14 November 2026 repairs

Anime/Flux remove dead routes and compare media duration with the episode's stated runtime. Earlier repairs cover DUB routing, subtitle mapping, title identity and movie media origins. See [13 November details](SOURCE_REPAIR_2026_11_13.md) and [14 November details](SOURCE_REPAIR_2026_11_14.md).

Update the app first: **1.0.159 (160)** includes host17 and the current subtitle-less SUB handling. Module definitions alone cannot supply missing host features. Host floors remain per-entry; AniPM requires host17/app1.0.158 or newer.

## 16 November 2026 movie paging (candidate, unpublished)

MovieDB and Alpha Movies 0.1.0-experimental.6 declare the provider's own next-page control, so browse and search continue past the first page and stop where the provider stops. This needs host18 / app **1.0.162** or newer. Older apps skip these two entries and keep the experimental.5 definitions they already have installed; they cannot newly install either source until the app is updated. Module identities, saved references and media routes are unchanged.

## Current phone catalogue

| Source | Module version | Minimum content host |
| --- | --- | --- |
| Synthetiq Anime | 1.3.16 | 16 |
| AniPM | 0.1.0-experimental.5 | 17 |
| Synthetiq Movies | 1.0.1-experimental.4 | 6 |
| AnimeAV1 | 0.1.0-experimental.1 | 9 |
| MovieDB | 0.1.0-experimental.6 | 18 |
| Alpha Movies | 0.1.0-experimental.6 | 18 |
| Synthetiq Flux | 1.0.0-experimental.7 | 16 |
| JustAnime | 0.1.0-experimental.3 | 16 |
| AnimeKai | 0.1.0-experimental.3 | 16 |
| KickAssAnime | 0.1.0-experimental.5 | 16 |

All entries remain experimental and non-recommended. Definitions passing fixtures or resolving a candidate does not guarantee a full download or provider uptime. Known limits include DNS-dependent media hosts, AniPM's desktop bot challenge, AnimeAV1 origin-policy failures, Synthetiq Movies HTTP451, and rejection of image-wrapped film segments. Flux shares upstreams with Anime and is not an independent supplier.

Complete workstation transfers and physical-device acceptance are separate. Build160 has been installed and launched on the owner's iPhone; this does not certify downloads, background operation, spoken audio, captions or offline playback on that device. SUB may be saved without a subtitle file when captioned alternatives fail; the app labels this and does not infer verified burned-in captions from a missing track.

The public app interprets bounded `.smod.json` data definitions and does not execute the historical Player ZIP/JavaScript archives. Preserve stable module identities and existing saved media. No keys, signed media links or personal data belong in this public repository.

## Files

- `catalogue.json` — installable phone data modules.
- `modules-data/*.smod.json` — bounded data definitions.
- `SOURCE_SHORTLIST.json` — requested source architecture and blockers.
- `SOURCE_COMPATIBILITY.json` — mapping, live inspection and remaining phone gates.
- `modules/*.zip`, `src/*` — historical executable packages for internal use.

This public repository is readable by the app without credentials. Do not add
secrets, private request tokens, signed media links or personal data.

## Anime 1.3.4 update — 2026-10-01

Install app 1.0.76 or later before updating Anime through the module manager.
The source family, module identity and existing episode aliases are retained.
The definition uses only bounded data operations. Five AniKage provider rows
and three Koto MegaPlay embed positions are declared; no Player JavaScript is
executed. EchoVideo and packed resolver routines remain outside this definition.

The mobile host now resolves relative HLS variants correctly. The isolated
Hermes/native-HTTP check reached the Death Note episode 1 SUB/DUB playlists,
but its simulator background-transfer service was unavailable. This is not
physical transfer or offline playback certification. Flux was compared as a
reference; a separate Downloads Flux definition was not published in that historical batch. It is now available as experimental.1; see the 11 October review.

## Anime 1.3.5 — Host 8

Requires Downloads 1.0.80 or later. Adds the published Player Wave/EchoVideo fallback as data, with declared origins and bounded URL path extraction. Update an installed Anime module separately from the app; app upgrades do not silently replace user-installed definitions. Existing module family IDs and episode aliases are retained. Full native phone acceptance remains pending; see SOURCE_COMPATIBILITY.json.

## AnimeAV1 — Host 9 / app 1.0.84

Update the app before installing this definition. It retains the published
Player identity and reads SvelteKit and player-call literals as bounded data.
Only the declared MP4Upload SUB server and exact HTTPS port are admitted.
The inspected episode was AV1 Main with AAC audio; device codec support matters.
Its Spanish subtitles were burnt into the sampled video, not selectable tracks.
Quality is unknown in the source response; Data Saver cannot promise a lower
rendition. Use Auto if you want the original file. Workstation transfer/decode is
recorded separately from native phone, background and offline playback acceptance.

## 8 October 2026 source batch

Current per-source Host 11–13 / Downloads 1.0.91–1.0.92 requirements, exact movie/TV identity, quality selection and genuine workstation transfer evidence are described in [SOURCE_BATCH_2026_10_08.md](SOURCE_BATCH_2026_10_08.md). Alpha and MovieDB are now installable experimental definitions. All entries remain non-recommended. The current tested MovieDB TV route returned a 20-second silent placeholder and failed content acceptance.

Exact Black Clover SUB/DUB transfer results, One Piece episode windows, Alpha’s empty S2E1 segment and MovieDB’s S2E1 placeholder are recorded in [OBSERVED_CDN_REPAIR_2026_10_08.md](OBSERVED_CDN_REPAIR_2026_10_08.md). Those workstation checks do not establish physical-phone acceptance.

## 11 October 2026 source review

The five current review candidates are **Synthetiq Anime, AniPM, Synthetiq Flux, Alpha Movies and MovieDB**. This is a three-anime/two-movie mix, not five certified independent media providers. Anime, AniPM and Flux used the same MegaPlay/CDN chain in the sampled cases. AnimeAV1 and Synthetiq Movies remain available for historical compatibility, with their current blockers preserved.

[Current remote-package and route comparison](SOURCE_REVIEW_2026_10_11.md) records commits, package hashes, actual quality options and failed routes. [MovieDB refinement](MOVIEDB_REFINEMENT_2026_10_11.md) records explicit IPCloud mapping and 39 focused tests. No new complete media/caption transfer or physical playback is asserted. Update installed modules through Settings separately from app updates.
