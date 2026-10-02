# Synthetiq Downloads Modules

This is the dedicated source catalogue for Synthetiq Downloads. On phones,
Settings → Modules → GitHub browses `kas021/synthetiq-downloads-modules`.

## Current phone catalogue

`catalogue.json` advertises four experimental data-only `.smod.json` definitions:

| Source | Downloads version | Minimum host / app | Recorded evidence |
| --- | --- | --- | --- |
| Synthetiq Anime | 1.3.5 | Host 8 / 1.0.80 | Current Player Wave/EchoVideo adaptation; paced workstation Black Clover E1 transfer and decode; native acceptance pending |
| AniPM | 0.1.0-experimental.1 | Host 6 / 1.0.75 | SUB/DUB resolution fixtures and inspections; one complete paced workstation SUB transfer; captions and native acceptance pending |
| Synthetiq Movies | 1.0.1-experimental.1 | Host 6 / 1.0.75 | Current `.fun` routes preserve `.vip` references; live playlists return 200, but AES-128 and separate audio still block downloads |
| AnimeAV1 | 0.1.0-experimental.1 | Host 9 / 1.0.84 | Bounded SUB MP4Upload route, complete workstation transfer/decode; sampled AV1 video has Spanish burnt-in captions; phone codec/playback acceptance pending |

None of these sources is recommended or phone-certified yet. Complete media transfers,
caption files and repeated offline playback on both physical phones remain open.
The catalogue records byte hashes and minimum runtime metadata. The host enforces
definition `minHostVersion`; a hash is provenance evidence rather than certification.

The previous executable ZIPs and source trees remain in `modules/` and `src/`
for owner rollback and internal comparison. They are not in the default phone
catalogue. A public phone build does not evaluate downloaded JavaScript.

`SOURCE_SHORTLIST.json` retains the eight requested Player identities and archive
provenance. `SOURCE_COMPATIBILITY.json` records current Downloads mapping and
specific gaps. Synthetiq Movies preserves the typed title slug and exact selected
season/episode identity, including legacy episode references. Its sampled current
Vix playlists return HTTP 200; separate audio and encrypted HLS packaging remain
unsupported. Source artwork/facets are unmapped. Alpha still needs metadata,
season and episode identity chaining and bounded media origins despite GCM decoding.
X-Stream, Mugiwara and AniWorld need additional bounded resolver operations; those
four sources have no install entry. AnimeAV1 now has a limited SUB route, without
selectable captions or other language variants. No provider is silently substituted.

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
reference; a separate Downloads Flux definition is not published here yet.

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
