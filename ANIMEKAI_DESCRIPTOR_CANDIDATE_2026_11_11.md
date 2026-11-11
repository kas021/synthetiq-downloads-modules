# AnimeKai descriptor candidate — not a default-catalogue release

Prepared on `codex/animekai-descriptor-20261111`. The default/main catalogue is
unchanged. Version0.1.0-experimental.3 retains `animekai-v1`, `animekai_v1`,
`SP-VID-093-ANIMEKAI`, saved aliases, host16 and app1.0.147 minimums.

Ported the current MegaPlay request pattern reviewed in official Player sources
(AniKoto5.0.6-beta.3, Anime1.0.5-beta.8 and AniPM0.1.0-beta.9): prefer
`/stream/getSourcesNew`, explicitly bind requested audio and preserve the older
descriptor as a conditional fallback. Both bounded encrypted and plain `sources`
responses keep the envelope's subtitle inventory. SUB-only and DUB-only routes
are excluded before network work for the other variant. Legacy requests start
only after the current route produces no accepted candidate. All existing IDs
remain; the extra legacy alternative IDs do not replace saved primary IDs.

Run the three actual Downloads-host fixtures from a compatible app checkout:

```sh
DOWNLOADS_APP_ROOT=/absolute/path/to/synthetiq-downloads \
  /absolute/path/to/synthetiq-downloads/node_modules/.bin/tsx --test \
  tools/test-animekai-descriptor.mjs
```

Fixtures cover current/plain responses, legacy/encrypted recovery, explicit DUB,
caption retention, no URL-ID guessing, missing embed identity and undeclared
hosts. No live media, private session token or executable source is committed.

Live checks on11November did **not** pass. The isolated primary QA could not
bind a canonical MAL ID from this catalogue's search result; the actual shared
canonical-fallback test timed out matching Frieren. A direct Death Note search
also failed under this Mac's system DNS. Public DNS resolves `animekai.be`, but
that alone is not usable source evidence. No full transfer, spoken-language,
caption synchronisation or native playback acceptance is claimed for AnimeKai.
Do not activate this candidate until title/episode mapping and fresh complete
SUB/DUB transfers pass. The app-side feedback report records the broader matrix.
