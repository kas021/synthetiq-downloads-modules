# Synthetiq Downloads Modules

This is the dedicated source catalogue for Synthetiq Downloads. On phones,
Settings → Modules → GitHub browses `kas021/synthetiq-downloads-modules`.

## Current phone catalogue

`catalogue.json` advertises three experimental data-only `.smod.json` definitions:

| Source | Downloads version | Minimum host / app | Recorded evidence |
| --- | --- | --- | --- |
| Synthetiq Anime | 1.3.4 | Host 7 / 1.0.76 | Current Player provider/header adaptation; Death Note E1 SUB/DUB HLS inspection (312 segments); mobile relative-URL regression fixed in app; full physical transfer pending |
| AniPM | 0.1.0-experimental.1 | Host 6 / 1.0.75 | Search/details/episode fixtures, response identity guards, live SUB/DUB playlist inspection; sampled episode returned no captions |
| Synthetiq Movies | 1.0.0-experimental.1 | Host 6 / 1.0.75 | Keyless search/details and movie/TV identity fixtures; original audio and Italian dub flags checked before the embed; live media inspection returned HTTP 403 |

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
season/episode identity, including legacy episode references. Its sampled Vix
master returned 403, and source artwork/facets remain unmapped. Alpha needs metadata/season/episode identity chaining despite
successful bounded GCM decoding. X-Stream, AnimeAV1, Mugiwara and AniWorld need
additional bounded extraction/hoster operations. Those five sources have no install entry in
this catalogue. No provider is silently substituted.

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
