# Source sweep — 15 November 2026

Every module was pinned on its own (a mirror catalogue holding only that module, plus Synthetiq Anime as a skipped primary for anime modules), run through the app's `complete-download-qa.ts` on one Mac in the UK with public DNS (`QA_DNS_SERVER=1.1.1.1`), sequentially with 18 s gaps. App 1.0.165, content host 18. This is workstation evidence only; no phone playback or native offline acceptance is claimed. Nothing in this note contains credentials, signed media URLs or personal data.

## Per module

Cases: Frieren E1 SUB, One Piece E1101 SUB, Fullmetal Alchemist (2003) E1 SUB, Death Note E1 DUB, Black Clover E170 DUB (anime); a TV episode, Inception, The Matrix, Dune: Part Two, Big Buck Bunny (movies).

| Module | Version | Search/match | Episodes | SUB | DUB / original | Complete transfer | Classification | Evidence |
|---|---|---|---|---|---|---|---|---|
| Synthetiq Anime | 1.3.16 | pass | pass (E1101 reached) | pass | pass (Death Note, Black Clover) | Frieren E1 SUB, 352,648,517 bytes, full decode passed, 8 caption documents | works end-to-end | 5/5 inspection plus verified transfer |
| Synthetiq Flux | 1.0.0-experimental.7 | pass | pass | pass | pass | Death Note E1 DUB, 237,602,397 bytes, full decode passed | works end-to-end | 5/5 plus verified transfer; same upstream hosts as Synthetiq Anime, not an independent supplier |
| JustAnime | 0.1.0-experimental.3 | pass | pass | pass | pass | Fullmetal Alchemist E1 SUB, 83,202,936 bytes, full decode passed | works end-to-end | 5/5 plus verified transfer; media from the same MegaPlay CDN as Synthetiq Anime |
| KickAssAnime | 0.1.0-experimental.5 | pass | pass | pass (provider caption documents) | Death Note pass; Black Clover E170 not offered | none (3 attempts failed) | inspection only; blocked outside the definition | 4/5; every resource fetched (HTTP 200), then the app's packager fails (below) |
| AnimeKai | 0.1.0-experimental.3 | not reachable | not reachable | not checked | not checked | none | blocked outside the definition (provider down) | Cloudflare HTTP 522 (below) |
| AniPM | 0.1.0-experimental.5 | HTTP 403 | not reached | not checked | not checked | none | unchecked from desktop | bot challenge to desktop clients on all 5 cases; not a verdict on the definition |
| AnimeAV1 | 0.1.0-experimental.1 | match skipped | not reached | declares SUB only | none declared | none | blocked outside the definition | Spanish-language source (declares only `sub`; earlier evidence: Japanese audio, hardcoded Spanish captions, no caption track). The app reports no compatible source for English requests; its one media origin has an explicit port the media-origin policy rejects. Not applicable to English requests; not retested with a Spanish expectation because the QA tool has no such option |
| MovieDB | 0.1.0-experimental.7 | pass | pass | n/a | original audio: TV episode, Inception, The Matrix and the default movie case pass; Dune: Part Two and Big Buck Bunny fail | none (media host down) | inspection only; route order fixed in this sweep | see below |
| Alpha Movies | 0.1.0-experimental.6 | pass | pass | n/a | same results as MovieDB (same Vidrock Atlas server) | none | inspection only | see below |
| Synthetiq Movies | 1.0.1-experimental.4 | HTTP 451 | not reached | not checked | not checked | none | blocked outside the definition (legal block in this region) | 451 on search and details |

## Root causes

**KickAssAnime.** Three complete transfers (Frieren E1 at 360p and 720p; Fullmetal Alchemist E1) fetched about 500 segments each, all HTTP 200, then failed at the app's packaging step (`native/adapters/node/hls-transfer.ts`): the remux runs `ffmpeg -c:v copy -c:a copy` over the video playlist plus the separate English/Japanese audio rendition, and ffmpeg stops with `Non-monotonic DTS; previous: 0, current: 0` on the audio stream (error -22). The provider's separate audio rendition has repeated zero timestamps. Not a title, language, caption or integrity failure; no definition field controls this, so no definition change was made. Proposal for the app (not applied): give the remux `-fflags +genpts` (and `-avoid_negative_ts make_zero`) for separate audio inputs, or re-encode that one audio input to AAC when the copy is refused; verify the result with the existing full local decode. This proposal has not been tested.

**AnimeKai.** `animekai.be` resolves (Cloudflare addresses) and completes TCP and TLS in under 0.1 s, but every HTTP request returns Cloudflare 522 (origin server did not respond) after about 20 s, across two edge addresses and several sequential attempts at 11:39, 13:29 and later UTC. Other Cloudflare hosts (the MegaPlay host, Vidrock) answered normally at the same time. The match timeout is therefore the provider origin being down or refusing Cloudflare, not a definition problem. Outage versus closure cannot be told from here. Inspection passed on 13 November.

**MovieDB / Alpha Movies.**
- VidLove (`api.vidlove.cc`, `player.vidlove.cc`) fails DNS (SERVFAIL; the zone has a DS record but its name servers answer nothing) on 1.1.1.1, 8.8.8.8 and 9.9.9.9. Dead since 13 November. All eight MovieDB VidLove routes depend on it.
- The only usable route is Vidrock. Of its servers: Atlas (`cdn2.slowcloud.live`) works but returned HTTP 522 from about 13:15 UTC and for the rest of the run (three more sequential checks 20 s apart, plus repeated tool attempts); Nova serves segments wrapped in PNG images, rejected by design; Orion serves from a different throwaway host per title, which cannot be declared and returned 502.
- Dune: Part Two (404): the Atlas playlist does not exist for that title while Nova lists it (9,947 s). Provider missing the title on the usable server, not a route defect. Big Buck Bunny: Atlas has no row (`map invalid`); same class.
- Complete movie and TV transfers failed at inspection with timeouts in three attempts, consistent with the Atlas outage. No complete transfer through either module could be obtained in this sweep.

## Decision on route order

MovieDB experimental.7 moves the two Vidrock routes ahead of the eight VidLove routes. Verified by comparison with the committed experimental.6: all ten routes are byte-identical per ID (nothing added, removed or edited), and only their order and the file version changed. Identity (TMDB ID, season, episode, runtime), origin declarations and integrity checks are untouched. The dead routes were ordered last rather than deleted (unlike the 14 November Anime/Flux removal) because the domain's DNS may be restored, saved manual-server selections keep resolving by ID, and failing DNS is fast, so ordering alone removes the delay. Alpha Movies already has only the Vidrock route, so it needs no change and stays at experimental.6 with its host 18 paging declaration. MovieDB keeps the experimental.6 host 18 paging declaration.

## Exact changes

| Module | Version | sha256 (exact file bytes) |
|---|---|---|
| MovieDB (`moviedb-wiki-v1`) | 0.1.0-experimental.7 (was .6) | `f29589ef30935142fb6cde0496d3e84a22a3647b9f774cc1d5c506e9398acfd5` |

No other definition changed. `catalogue.json` hashes of all ten files were recomputed and match. Tools: `tools/test-moviedb-route-order.mjs` added; `tools/test-movie-paging.mjs` accepts MovieDB .7 and Alpha Movies .6. All tool tests pass against app 1.0.165.

## Not checked, and why

- Phone playback, native offline transfer and spoken-language verification: out of scope for a workstation sweep.
- AniPM: desktop clients receive a bot challenge; needs a device check.
- Synthetiq Movies: HTTP 451 in this region; needs a network outside it.
- Complete movie/TV transfer through MovieDB or Alpha Movies: Atlas down for the whole run.
- KickAssAnime complete transfer: blocked by the app packager; the proposed fix is untested.
- AnimeAV1 with a Spanish-audio expectation: the QA tool cannot request it.

## Recommended default one-link install set

The owner decides; no module was deleted or hidden.

1. Synthetiq Anime, Synthetiq Flux, JustAnime: complete verified transfers (but they share upstream hosts, so they are one supplier family, not three).
2. Keep out of the default set, still installable on request: KickAssAnime (until the packager handles its audio), MovieDB and Alpha Movies (inspection only, single usable media server, currently down), AnimeKai (provider down), AniPM (unchecked), AnimeAV1 (Spanish source), Synthetiq Movies (blocked in the test region).
