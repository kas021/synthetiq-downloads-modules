# Source repair — 13 November 2026

Data-only definition updates for Synthetiq Downloads. Evidence is live inspection
and two complete workstation transfers from one network; it is not phone
acceptance and not provider certification.

| Source | Version | Change |
| --- | --- | --- |
| Synthetiq Anime | 1.3.15 | English DUB through explicitly DUB routes; providers that no longer exist removed; dead routes run last. Host 16. |
| Synthetiq Flux | 1.0.0-experimental.6 | DUB rescue routes after the SUB route; removed providers that no longer exist. Host 16. |
| KickAssAnime | 0.1.0-experimental.5 | SUB routes map the provider's subtitle documents; two caption origins declared. Host 16. |
| JustAnime | 0.1.0-experimental.3 | Provider AniList ID on search rows and stated MAL ID on details; full search is primary. Host 16. |
| AnimeKai | 0.1.0-experimental.3 | Descriptor candidate from 11 November, now listed. Carries a limited title set. Host 16. |
| Alpha Movies, MovieDB | 0.1.0-experimental.5 | Three current media origins declared. TV episodes resolve; films only when the provider offers an ordinary server. |
| AniPM | 0.1.0-experimental.5 | Current session route with explicit Japanese (SUB) and English (DUB) audio. Requires Downloads 1.0.158 / Host 17. Unverified on a device; desktop HTTP clients receive a bot challenge. |

Unchanged and not working from the test network: AnimeAV1 (media on an explicit
port, rejected by the media-origin policy) and Synthetiq Movies (HTTP 451 legal
restriction). Image-wrapped film segments are rejected by design.

Known gaps: SUB fails for titles whose sources carry no subtitle track (observed
for K-On!, K-On!! and Tomorrow's Joe 2); Tomorrow's Joe 2 has no English dub at
any listed source. Complete transfers: K-On! E1 DUB through Synthetiq Anime and
Inception through MovieDB's fallback route. Spoken language was not verified by
listening.
