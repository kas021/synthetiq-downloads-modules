# Synthetiq Downloads Modules

This is the dedicated source catalogue for Synthetiq Downloads. On phones,
Settings → Modules → GitHub browses `kas021/synthetiq-downloads-modules`.

## Current phone catalogue

`catalogue.json` advertises data-only `.smod.json` definitions. The current
entry is Synthetiq Anime 1.3.1 under `modules-data/`. It exposes catalogue,
episode, server and caption mappings through the bounded Downloads host. A live
resolution probe succeeded for sampled SUB and DUB episodes; complete download,
caption-file and offline playback acceptance on both phones remains open.

The previous executable ZIPs and source trees remain in `modules/` and `src/`
for owner rollback and internal comparison. They are not in the default phone
catalogue. A public phone build does not evaluate downloaded JavaScript.

`SOURCE_SHORTLIST.json` records the requested small source set and each
candidate's current compatibility. Entries there are planning metadata, not
installable modules. A source is added to `catalogue.json` only after it has a
bounded definition and its claimed capabilities are verified.

## Files

- `catalogue.json` — installable phone data modules.
- `modules-data/*.smod.json` — bounded data definitions.
- `SOURCE_SHORTLIST.json` — requested source architecture and blockers.
- `modules/*.zip`, `src/*` — historical executable packages for internal use.

This public repository is readable by the app without credentials. Do not add
secrets, private request tokens, signed media links or personal data.
