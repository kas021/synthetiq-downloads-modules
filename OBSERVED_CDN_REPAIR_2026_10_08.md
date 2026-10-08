# Exact CDN declarations — 8 October 2026

## Change and provenance

Anime 1.3.11 declares only the new exact hosts returned by the identity-checked Black Clover E1 routes: `o3izr.stellarfrontier.space` (SUB) and `n953x.midnightvoyage.site` (DUB). Alpha 0.1.0-experimental.3 declares `carbonphantom.live`, returned by the bounded Vidrock Orion decoder for The Mentalist, TMDB TV 5920, season 2 episode 1, source episode 367714. Alpha retains SP-VID-079-ALPHA-MOVIES and does not use MovieDB media fallback.

All three hosts resolved only to public unicast IPv4/IPv6 addresses at the check. This is point-in-time DNS evidence, not a claim of permanent DNS behavior. No new wildcard was introduced. Arbitrary siblings, deceptive suffixes, IP alias services and non-default ports remain rejected by fixtures and production policy.

Remote read-only `ls-remote` recheck still identified Player `aaee1e1b4c59b3683e13ecf88d761ec947281ecd` and catalogue `db9197d32f776af12641051960602a374cdd440e`. Previously verified fresh published packages remain Anime 1.0.5-beta.3 and Alpha 0.2.0-beta.2. Anime's MegaPlay source decoder follows the provider payload; Alpha's `providerSources` decrypts returned entries and checks public HTTP URLs. Neither package hardcodes these rotating hosts. Downloads retains its stricter declared-origin contract and executes no remote JavaScript.

Host 13 permits at most 24 declarations. More than 16 requires minHostVersion 13; the existing more-than-12 Host 8 gate remains. Anime requires Host 13/app 1.0.92. Alpha remains Host 12/app 1.0.92. Anime's Jikan fallback Referer now uses its already declared API origin; its apex-only declaration was removed. Live direct Jikan verification timed out connecting before an HTTP response; unchanged metadata/route fixtures and live AniList metadata passed.

## Inspection evidence

- Black Clover E1 SUB: AniList 97940 / MAL 34572; exact `anikage-megaplay:primary`; 325 segments, 1432.117 seconds, nine mapped captions.
- Black Clover E1 DUB: same title/episode identity; exact DUB request; 343 segments, 1431.96 seconds, nine mapped captions.
- Alpha The Mentalist S2E1: exact TV 5920 / season 2 / episode 1 / source episode 367714; `vidrock-episode:Orion`; 520 segments, 2602.975 seconds against metadata expectation 2580 seconds; no mapped captions.
- One Piece: production episode windows 21–72 and cursor 73–124 each returned 52 correctly numbered unique episode references; total 104 distinct routes.
- MovieDB same S2E1: 480p redirect to undeclared `api.sublime.st` remains blocked. Its admitted 360p fallback fully transferred 31,577 bytes but contained only 20 seconds of H.264 video and no audio; completed-media acceptance failed. It remains experimental/non-recommended.

Private response/playlist/signed URL evidence and full transfer results are under `/Volumes/ZX20/DownloadsPhoneQA/2026-10-08/source-batch`. No signed URL or transferred media is included in Git. Transfers are serialized, with at most two paced segment requests within one active probe. A first SUB attempt hit a transient connection failure after 280/325 segments; the repeated complete probe records retries independently.

All definitions remain non-recommended/experimental in presentation. Workstation transfer, full decode, spoken-language assessment and native phone acceptance are separate evidence levels. No physical phone acceptance is claimed.

## Completed additional workstation media checks

| Exact requested case | Bytes / segments | Media | Captions | Full decode |
| --- | --- | --- | --- | --- |
| Black Clover E1 SUB | 253,940,248 / 325 | H.264 1920×1080 + AAC; 1432.181 s | English WebVTT, 350 cues | Exit 0; 0 error lines |
| Black Clover E1 DUB | 240,600,520 / 343 | H.264 1920×1080 + AAC; 1432.040 s | English WebVTT, 350 cues | Exit 0; 0 error lines |

Both completed-media guards passed. Successful repeats recorded zero retries; the earlier interrupted SUB attempt is retained as a separate limitation in this note. Spoken audio language was not assessed. The final Jikan retry forced IPv4 with 8-second connect / 15-second total bounds; it still timed out before an HTTP response (HTTP 000), so header acceptance remains unverified.

Focused Host 13/current-source fixtures: 107/107 passed. Final exact-origin/catalogue/curated gate: 19/19 passed.

## Later-season Alpha full-transfer failure

The exact Mentalist S2E1 route transferred 519 of 520 segments (191,145,992 bytes; 394.949 seconds elapsed, zero transient retries) before strict MPEG-TS validation rejected segment 474. One bounded refetch of that exact declared URL returned HTTP 200, `Content-Type: text/html`, and **zero bytes**. No segment was skipped or substituted. Full assembly/decode and completed-media acceptance were not claimed for this incomplete package. This later-season route remains experimental despite correct identity and playlist-duration inspection. The previously successful Alpha S1E1 transfer is a separate case and does not certify S2E1.

Private evidence: `alpha-s2e1-transfer/result.json`, `rejected-segment-474.json`, and the zero-byte captured body. The actual resolver response, signed URL and playlists remain private. MovieDB's same S2E1 separately failed completed-media acceptance because its admitted fallback was a 20-second silent placeholder; neither source passes later-season full-media acceptance in this check.

AniPM is published as **0.1.0-experimental.4** because its declared CDN suffixes changed from the already published experimental.3 package. The version increment ensures installed clients discover the repair; source identity, Host 11/app 1.0.91 compatibility and experimental status are unchanged.
