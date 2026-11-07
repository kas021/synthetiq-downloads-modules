# Synthetiq Downloads Modules

This is the dedicated source catalogue for Synthetiq Downloads. On phones,
Settings → Modules → GitHub browses `kas021/synthetiq-downloads-modules`.

## Published repair — 7 November 2026

The default catalogue now contains the reviewed Host 16 repairs. Update Downloads
before updating these modules: the five repaired definitions require **1.0.147
(build148) or later**. The latest tested app hardening is **1.0.148 (build149)**.
Existing media and saved module identities are preserved. Sources remain explicit
user imports; this catalogue does not add any source to a fresh app automatically.

See [publication and validation](SOURCE_PUBLICATION_2026_11_07.md) and the
[original repair evidence](SOURCE_REPAIR_2026_11_05.md).

## Current phone catalogue

Ten experimental data-only definitions are available:

| Source | Downloads module version | Minimum host / app |
| --- | --- | --- |
| Synthetiq Anime | 1.3.14 | 16 / 1.0.147 |
| AniPM | 0.1.0-experimental.4 | 11 / 1.0.91 |
| Synthetiq Movies | 1.0.1-experimental.4 | 6 / 1.0.75 |
| AnimeAV1 | 0.1.0-experimental.1 | 9 / 1.0.84 |
| MovieDB | 0.1.0-experimental.4 | 12 / 1.0.92 |
| Alpha Movies | 0.1.0-experimental.4 | 12 / 1.0.92 |
| Synthetiq Flux | 1.0.0-experimental.5 | 16 / 1.0.147 |
| JustAnime | 0.1.0-experimental.2 | 16 / 1.0.147 |
| AnimeKai | 0.1.0-experimental.2 | 16 / 1.0.147 |
| KickAssAnime | 0.1.0-experimental.4 | 16 / 1.0.147 |

All entries remain experimental and non-recommended. Successful complete Mac
transfers, native builds, physical transfers and offline playback are recorded
separately. A valid catalogue hash establishes exact bytes, not provider uptime
or certification. English fallback declarations do not assert that every title
has a DUB or complete dialogue captions. Known failed routes remain documented.

The maximum host requirement is 16; individual entries retain the compatibility
floor in the table. Older applications must not install unsupported definitions.
Do not delete existing downloads or reinstall the app to update a module.

The historical executable archives in `modules/` and `src/` are not offered in
the phone catalogue. Public Downloads builds interpret bounded data definitions
and do not execute those archives. The dated sections below retain historical
evidence and are not current availability guarantees.

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
