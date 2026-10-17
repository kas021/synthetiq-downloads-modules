# Downloads source follow-up — 17 October 2026

Reviewed data-only updates, still experimental/non-recommended:

- Anime1.3.12 / Flux experimental.2: two exact observed EchoVideo CDN origins.
  EchoVideo is SUB-only: Joe2E21 SUB/DUB returned identical media URL hashes;
  the provider-labelled DUB speech sample was Japanese. Other declared DUB
  alternatives remain unchanged. No verified English DUB for that episode was found.
- Alpha experimental.4: observed Luna/Orion origins.
- MovieDB experimental.4: labelled Vidrock fallback with exact title/season/
  episode/runtime checks after the primary API returned empty source data.

Alpha The Mentalist S2E1 fully transferred380,218,200 bytes and passed full
FFmpeg decode.37 successful transient retries were needed. The diagnostic
Joe route transferred99,227,862 bytes and decoded, but FAILED DUB audio
acceptance; this is transport evidence, not a valid English DUB download.

Downloads1.0.119/build120 adds bounded native transient segment retries and
an optional, reviewed resolution-only server fallback. The server returns links;
clients still inspect, transfer and verify. It stores/proxies no video.

Physical phone playback/captions and the full-length movie result are recorded
separately in the app repository evidence; no source is certified by these checks.
