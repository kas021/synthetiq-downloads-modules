# Source batch — 8 October 2026

## Scope and provenance

Downloads definitions remain declarative JSON. Host 11 adds finite provider media-type mapping, explicit Original audio, bounded caption inventory selection and metadata-derived expected duration. Response media and playlist hosts must match declared exact origins or vetted strict suffixes. Host 12 adds explicit TMDB presentation identity; Host 13 permits up to 24 declared origins without changing origin matching. No remote JavaScript is executed.

Read-only remote references: Player `aaee1e1b4c59b3683e13ecf88d761ec947281ecd`; Player catalogue `db9197d32f776af12641051960602a374cdd440e`. Fresh published ZIP SHA-256 values were checked against that catalogue: Anime 1.0.5-beta.3, AniPM 0.1.0-beta.4, Alpha 0.2.0-beta.2 and MovieDB 0.1.0-beta.12. `SOURCE_SHORTLIST.json` retains their package provenance. These versions differ from local development snapshots.

Current Downloads versions: Anime 1.3.11 (Host 13/app 1.0.92), AniPM 0.1.0-experimental.4 (Host 11/app 1.0.91), MovieDB 0.1.0-experimental.2 and Alpha 0.1.0-experimental.3 (Host 12/app 1.0.92). All remain non-recommended until native device acceptance. Exact rotating-CDN repairs and additional Black Clover/later-season evidence are recorded in OBSERVED_CDN_REPAIR_2026_10_08.md.

Anime and AniPM retain existing IDs and exact SUB/DUB route selection. Their muxed MegaPlay route matches the fresh AniPM upstream reliability direction. Player's new Anime season-group presentation was reviewed but is not ported to Downloads: Downloads retains its existing AniList title/episode contract.

Alpha explicitly uses the shared MovieDB TMDB-ID catalogue for search/title/season/episode metadata, then only Alpha's Vidrock media resolver. It retains `alpha-movies`, `alpha_movies_v1`, and `SP-VID-079-ALPHA-MOVIES`; there is no silent MovieDB media fallback. MovieDB retains `moviedb-wiki-v1`, `moviedb_wiki_v1`, and `SP-VID-083-MOVIEDB`.

Both movie definitions preflight exact title ID and media type. TV additionally checks selected source episode ID, season, episode number and aired status before the media request. Runtime from that exact metadata is carried separately as expected duration. Unknown/invalid expected runtime fails closed. Native completion must contain audio and video and agree with expected duration within max(90 seconds, 10%). An HLS mismatch fails during inspection.

## Genuine workstation transfers

| Definition / request | Full transfer | Decoded media | Captions | Result |
| --- | --- | --- | --- | --- |
| Anime / Death Note E1 SUB | 312/312 TS segments; 248,587,136 bytes; 116.11 s elapsed | 1377.084 s; H.264 1920x1080 + AAC | English WebVTT, 329 cues | Full decode exit 0, no errors |
| AniPM / One Piece E1 requested DUB | 321/321 TS segments; 233,048,184 bytes; 118.999 s elapsed | 1477.976 s; H.264 1440x1080 + AAC | English WebVTT, 285 cues | Full decode exit 0, no errors |
| Alpha / The Mentalist S1E1 Original | 542/542 TS segments; 196,644,240 bytes; 172.629 s elapsed | 2709.142 s; H.264 640x360 + AAC | None mapped | Full decode exit 0, no errors |
| MovieDB / The Mentalist S1E1 auto 480p Original | 31,577-byte MP4, repeated identically | **20 seconds; 1280x720 H.264; no audio** | None | **Failed content acceptance: provider placeholder. App source-media guard rejects it.** |

Transfers used bounded checked origins, two paced segment workers, full assembly, ffprobe and full ffmpeg decode. This tests actual transferred media, separately from the phone's native transfer engine. Signed URLs and media remain in the private QA directory `/Volumes/ZX20/DownloadsPhoneQA/2026-10-08/source-batch`; none are included in distribution files. `*-transfer/result.json` records hashes, bytes, duration and decode results. A `complete:true` field records completion of transfer bytes; MovieDB also records `sourceAcceptance:failed` and must never be interpreted as content acceptance.

Both Anime and AniPM SUB/DUB live route inspections passed. AniPM source 1642 currently identifies **One Piece**; older notes calling that ID Death Note were incorrect. Alpha Inception movie inspection also passed (917 clear-HLS segments, about 148 minutes); full movie transfer was not performed. MovieDB movie/TV search, metadata, exact routes and media inspection passed, but those checks did not detect the TV placeholder before full media inspection. Its upstream VidZen fallback returned HTTP 401 and is not included.

## Limits and acceptance still required

- These are workstation results, not iPhone/Android acceptance. Phone backgrounding, cancellation/recovery, sequential jobs, Library publication and offline playback still require device tests.
- Requested language is preserved through exact route assertions. Spoken language and A/V synchronization have not been assessed by listening/watching.
- Alpha captions are not mapped; Original audio captions are optional. Anime SUB remains caption-gated.
- MovieDB search currently returns the first bounded page; generic filters/home feeds and search continuation are not mapped. Metadata with missing runtime fails closed rather than guessing a duration.
- Original/Auto does not invent a resolution. Explicit quality and saved quality caps require a known matching height; unknown-height streams fail that selection honestly.
- MovieDB remains experimental because the tested current source returns a silent placeholder. A successful HTTP response or decodable short video does not make it a valid episode.
