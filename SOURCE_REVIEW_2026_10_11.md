# Downloads source shortlist audit

Date: 2026-10-11  
Scope: read-only comparison of seven Downloads declarative source definitions with the latest available Synthetiq Player module packages, plus bounded live catalog/resolver/playlist inspection. No media segments or full media files were transferred. No physical-device playback was tested.

## Decision

The final five candidates are **Synthetiq Anime, AniPM, Synthetiq Flux, Alpha Movies and MovieDB**. Anime/AniPM/Flux cover anime; Alpha/MovieDB cover movies and TV. All remain experimental and non-recommended pending full Downloads/native acceptance.

- Anime and AniPM passed sampled Death Note E1 SUB/DUB inspections with caption metadata.
- Flux passed sampled Re:ZERO E1 SUB/DUB only through its labelled rescue route after upstream failures.
- Alpha passed sampled TV inspection with a real 1080/720/360 HLS ladder and no mapped captions.
- MovieDB initially failed this audit. The later beta.14 translation in `0.1.0-experimental.3` repairs explicit IPCloud HLS mapping and retains discovered MovieBox direct-file options. See the dated refinement below; new full transfer/caption/phone acceptance is still pending.

AnimeAV1 is held because its current only route fails exact media-origin inspection. Synthetiq Movies is held because separate audio/encrypted HLS remains unsupported. Their historical evidence is preserved.

The five entries are a source-review shortlist, not a five-independent-provider claim. The three anime providers that passed today converged on `anikage.cc` / `megaplay.buzz` and the shared `fetch.nexabloom.top` CDN in the inspected samples. A failure in that chain can affect all three.

## Remote Player baseline

- The private `kas021/Synthetiq-Player` default branch currently resolves to commit `aaee1e1b4c59b3683e13ecf88d761ec947281ecd` (2026-09-30). GitHub's latest listed app release is `v8.2.1` (2026-08-16); this app-repository state is context, not a module-bundle version.
- The public `kas021/Synthetiq-Modules` default branch resolves to `0699d6a2335067dec9e418fb06ac2d47893ef4d7` (2026-10-09). Latest published catalogue/bundle inspected: `bundle-146`, published 2026-10-09 22:11:53Z. Bundle SHA-256: `c262387fd5f87f7e8a6f4415332319bfdd3848c1005615aca926d2ea541e3916`.
- In bundle 146 the module catalogue marks Synthetiq Anime, AniPM, and Synthetiq Flux recommended. Alpha Movies, AnimeAV1, and MovieDB are present but non-recommended. Synthetiq Movies is absent; a 1.2.5 ZIP remains in the remote repository's main tree, outside this bundle.
- Current Downloads content host is 13 (`native/core/content-module.ts:45`). All seven local definitions' `minHostVersion` values are at or below 13. The host version tells which declarative operations are supported; it does not certify a route or source.

## Package and local-definition identities

Remote SHA-256 values below are release-asset digests where the package has a tagged release. The Synthetiq Movies value is the hash of the latest retrievable main-tree ZIP, not a bundle-146 asset. Local hashes are the exact checked-in `.smod.json` bytes.

| Source | Current remote Player package | Remote package identity / SHA-256 | Downloads definition | Downloads identity / SHA-256 |
|---|---|---|---|---|
| Synthetiq Anime | `1.0.5-beta.3` (tagged 2026-10-07) | `synthetiq-anime-v1` / `9f03899641ba3aab8f45eb069312ed9ead6a5d8b53dc01fb461d7a1064e4ebd7` | `1.3.11`, min host 13 | `synthetiq-anime-v1`, `SP-VID-074-SYNTHETIQ-ANIME` / `b994085f02aefebc6f0663ecbc026e17f764af649a43c4046efa3978a4d1be9f` |
| AniPM | `0.1.0-beta.4` (tagged 2026-10-07) | `anipm-v1` / `501ffce64440f18354246610d60883dc3d4c48a819cbc23a9186c0de2a28d126` | `0.1.0-experimental.4`, min host 11 | `anipm-v1`, `SP-VID-084-ANIPM` / `d6b6054170e4de6000c138e23e8be5afb25262b56f9c3c577aeebd80ef292fa0` |
| Synthetiq Flux | `1.0.3-beta.5` (tagged 2026-10-06) | **Archive ID** `synthetiq-anime-direct`; archive manifest says `1.0.3-beta.4`; archive SHA `1fd232d5dcb9a65e823cbf2146294356a56f11a1a5fec6a53486a30a9a8c9f9c` | `1.0.0-experimental.1`, min host 13 | `synthetiq-flux-v1`, `SP-VID-077-SYNTHETIQ-FLUX` / `594db474c576f8b775155246d0144f4f2fbad52b37933644f7660bdbd8ed0823` |
| Alpha Movies | `0.2.0-beta.3` (tagged 2026-10-09) | `alpha-movies` / `169a207b996f135ec2b5d2aa8d81ca5d32904454e75dc74b2c42cb7356580e7c` | `0.1.0-experimental.3`, min host 12 | `alpha-movies`, `SP-VID-079-ALPHA-MOVIES` / `86c7ed0251014e7fc05a379a39b125e9b52e5eb68e8dd03a1c6e3af342a832d0` |
| Synthetiq Movies | `1.2.5` (main-tree ZIP; absent from bundle 146) | `synthetiq-movies-v1` / `f48fa9a64489db1b92487b92b6e33c3e07fa3ce452ed4096187f3ea40c327208` | `1.0.1-experimental.1`, min host 6 | `synthetiq-movies-v1`, `SP-VID-059-SYNTHETIQ-MOVIES` / `b35f33febfbaf3bfaf052f31aeec58ad8ba0283145681683150be602dbf8ee3f` |
| MovieDB | `0.1.0-beta.14` (tagged 2026-10-09) | `moviedb-wiki-v1` / `e1187d6bc571dcb24c1c8340378bf1f191f8cdd7bef8b8d553258e818ba9f3d6` | `0.1.0-experimental.3`, min host 12 | `moviedb-wiki-v1`, `SP-VID-083-MOVIEDB` / `d5fa9c15d91cedd2036d57cee01db4c3b04ac8ea19fb9e4a7160085ac7e92154` |
| AnimeAV1 | `1.3.0-beta.4` (tagged 2026-09-27) | `animeav1-v1` / `3b039a10a2952569bb879d6a18ca9f979ccdc53cbfecfe72dd3a2241b0fc6175` | `0.1.0-experimental.1`, min host 9 | `animeav1-v1`, `SP-VID-060-ANIMEAV1` / `fa93e78d57b1e64dddf9d544c943f7d008a608ed63416d543eb85d19d203bb7d` |

Player and Downloads package versions/implementations are separate. Package availability or similar display names do not establish parity. Flux is the clearest identity/version mismatch: the remote package uses `synthetiq-anime-direct`, while Downloads uses `synthetiq-flux-v1`; the released archive filename/tag says beta.5, but the embedded manifest says beta.4.

## Initial bounded live inspection (before MovieDB repair)

Each probe used the current Downloads definition and production host code, with a 9-second per-request timeout, at most 36 requests, at most 2 MiB per response, 16 MiB aggregate response bytes, and a 28-second resolver budget. The requests included catalogue/detail/episode data and bounded manifests/inspection metadata. No media segments were transferred. Counts and response bytes below are probe traffic only, not download sizes.

| Downloads source and sample | Result today | Actually inspected options | Request evidence |
|---|---|---|---|
| Synthetiq Anime, Death Note E1 SUB and DUB | Both passed. 312 HLS segments declared, ~1,377 s; route labels `sub` / `dub`. | One 1920×1080 master variant (Auto); one mapped English caption option. The route audio label was not verified by decoding audio. | SUB 10 requests / 57,388 bytes; DUB 10 / 56,435 bytes. Both reached AniKage/MegaPlay. |
| AniPM, Death Note E1 SUB and DUB | Both passed. Same 312 segments / ~1,377 s. | One 1920×1080 master variant (Auto); one mapped English caption option. Audio labels are route metadata, not decoded-track validation. | SUB 10 / 99,517 bytes; DUB 10 / 98,581 bytes. Both reached AniPM/MegaPlay. |
| Synthetiq Flux, Re:ZERO E1 SUB and DUB | Both passed only after route failures; selected route was labelled `Rescue · AniKage · MegaPlay`. SUB had 2 earlier route failures. DUB had 2 earlier failures and 4 HTTP 502 responses. | One 1920×1080 master variant (Auto); one mapped English caption option. Audio labels are route metadata. | SUB 11 / 112,557 bytes (10.374 s); DUB 18 / 119,040 bytes (1.968 s). The provider's cold response timing varies, so these elapsed times are not a stable SLA. |
| Alpha Movies, The Mentalist S1E1/Pilot original | Passed. 271 segments, ~2,707 s. | Three master variants: 1920×1080, 1280×720, 640×360. No mapped module captions and no playlist captions in this response. Provider's “English” label was not independently verified from audio. | 9 requests / 202,383 bytes; 2.579 s. |
| Synthetiq Movies, Inception movie original | Failed: `streamingunity-movie-original` inspection rejected; no usable declared route. | No accepted media options. Current probe does not identify which specific inspection predicate failed. | 8 requests / 641,801 bytes; 1.095 s; HTTP responses were successful, but that is not a usable-route result. |
| MovieDB, The Mentalist TV S1E1 original | Failed: all three TV mapping alternatives (`auto`, `vidapi`, `megaknight`) failed mapping. | No accepted media options. | 8 requests / 211,584 bytes; 2.066 s; all HTTP responses were 200, but the mappings did not yield an accepted route. |
| AnimeAV1, Death Note E1 SUB | Failed: the only alternative failed declared media-origin inspection for its MP4Upload route. | No accepted media options. The local definition has no selectable quality or caption track. | 5 requests / 509,689 bytes; 1.024 s. |

Historical Downloads evidence is stronger for some than this small live sample: the 2026-10-08 production checklist records Anime live coverage and full transfer plus local simulator playback; Alpha has a prior full workstation transfer; AnimeAV1 has a prior paced workstation transfer and full AV1 decode. These are not physical-phone playback. AniPM has earlier transfer evidence in `docs/REBUILD_2026_10_08.md`; its spoken audio identity remains unverified. Player release notes or Player-side verification are not counted as Downloads evidence.

## Candidate-specific parity gaps

- **Synthetiq Anime:** remote Player package explicitly groups seasons in search; Downloads compatibility notes say season grouping is not mapped. Current Downloads media inspection exposed one master variant, so no selectable quality ladder was demonstrated.
- **AniPM:** Downloads definition is experimental and relies on two MegaPlay SUB/DUB routes. Its live pass does not prove title-wide coverage or spoken language.
- **Flux:** remote Player beta.5 changelog reports slow cold-provider retries and an AniKage rescue. The current Downloads definition is experimental.1 and today only the rescue route passed; the three anime shortlist entries share media dependencies in these samples.
- **Alpha Movies:** remote Player beta.3 changelog adds embedded subtitles, but Downloads has no subtitle mapping and the current response exposed none. Downloads' Alpha catalogue metadata is shared through MovieDB/TMDB; its media resolver is separate and does not silently fall back to MovieDB.
- **AnimeAV1:** remote Player beta.4 includes UPNShare/Voe alternatives; Downloads has only the MP4Upload route. The current sampled route fails exact origin inspection. The prior sampled file was AV1 Main 1080p plus AAC and hard-coded Spanish captions; that one file says nothing about every title, and its source label does not prove Japanese audio.
- **MovieDB:** the initial unmapped beta.14 route is repaired in experimental.3. Current IPCloud HLS and MovieBox direct-file inspections passed; the historical 20-second silent placeholder remains an explicit full-content acceptance gate.
- **Synthetiq Movies:** remote 1.2.5 is not in current bundle 146. Downloads' current live movie route fails inspection; existing production notes document separate audio renditions the current transfer engine cannot handle.

## Limits and evidence references

- No media file or segment was downloaded; no native download, demux, audio-language analysis, caption cue validation, or physical playback was performed in this audit.
- The HLS variant list is only what the sampled master playlist advertised. A 1080p variant does not prove the route will transfer/decode successfully on a device. English/SUB/DUB are provider/definition labels unless explicitly described as observed caption metadata.
- The focused historical evidence is in `docs/PRODUCTION_CHECKLIST_2026_10_08.md`, `docs/REBUILD_2026_10_08.md`, and `modules-data/curated-compatibility.json`. The current host version is in `native/core/content-module.ts:45`.
- The live-probe scripts are retained alongside this report in this ignored `.local` directory. They log redacted hostnames and aggregate counts only; no signed URLs, credentials, or response bodies are saved here.

## MovieDB repair and quality evidence

The production Downloads resolver now maps beta.14 IPCloud `source.url` responses to explicit movie/TV routes, verifies provider/title/type/season/episode identity, and preserves automatic MovieBox `source.qualities` mapping. Only the two observed exact CDN origins were added.

The Mentalist S1E1 IPCloud declared 271 segments / 2709.165 s / 1280×720 and 89 VTT metadata rows (64 surfaced under the cap, English first). Inception IPCloud declared 889 segments / 8888.046 s / 1280×536 and no captions. These samples together used 13 requests / 555,267 bytes. A separate automatic direct-file inspection exposed TV 1080/720/480/360 and movie 1080, using 11 requests / 270,432 bytes, including two bounded HTTP206 range reads. No complete segment/file or caption transfer was made. Unknown resolutions retain Original.

Focused MovieDB/Alpha regression: 39/39 tests passed. Publication must retain experimental/non-recommended labels and the historical placeholder failure.
