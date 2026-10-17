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

## Complete-transfer follow-up — Downloads 1.0.120 / build 121

The higher Inception rendition completed 1,037,532,653 bytes at 1280×534 and
passed full video/audio decoding across 8,888 seconds. The bounded workstation
transport recovered 233 transient failures. Its lower 640×266 rendition contains
a reproducible corrupt provider frame; that failed result remains recorded.

Anime 1.3.12 completed Death Note E1 SUB (237,614,996 bytes) and Black Clover E1
DUB (230,264,675 bytes), both with full video/audio decode and validated English
VTT sidecars. Black Clover's short local speech sample estimated English;
whole-track spoken-language verification remains separate. These runs use the
workstation transport, not native phone background execution.

Downloads 1.0.120 adds a bounded selected-HLS media-host check after a live
playlist referenced an ENOTFOUND segment host. Definite DNS/connect failures can
advance automatic selection; uncertain HEAD responses retain ordinary transfer
handling. The same check is deployed in the Downloads-only server worker.
The subsequent live Black Clover route was healthy and did not exercise a live
failover. Definitions, versions and hashes are unchanged by this follow-up.

MovieDB and Alpha share Vidrock; Anime and Flux share the inspected MegaPlay
supplier, also used by AniPM's audited route. Module count is not an independent
provider count. Joe2 E21 English DUB and its required SUB-caption route remain
unverified/unusable among checked routes. Physical phone acceptance is pending.

Flux's later Black Clover DUB audit failed its flow/zuri resolution alternatives
before its MegaPlay fallback passed inspection (about 21 seconds to inspect).
This is a route-level failure and recovery, not a complete Flux download pass.
