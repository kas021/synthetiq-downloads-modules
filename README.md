# Synthetiq Downloads Modules

This is the dedicated source catalogue for Synthetiq Downloads. On phones,
Settings → Modules → GitHub browses `kas021/synthetiq-downloads-modules`.

## Current phone catalogue

`catalogue.json` advertises three experimental data-only `.smod.json` definitions:

| Source | Downloads version | Minimum host / app | Recorded evidence |
| --- | --- | --- | --- |
| Synthetiq Anime | 1.3.3 | Host 5 / 1.0.72 | Exact SUB/DUB fallback and playlist inspection after primary HTTP 502s; sampled SUB returned seven caption tracks |
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
