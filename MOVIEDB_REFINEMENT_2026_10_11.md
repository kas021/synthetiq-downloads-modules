# MovieDB IPCloud refinement evidence — 2026-10-11

## Change

The Downloads definition preserves its module ID, family, and identity, and advances from `0.1.0-experimental.2` to `0.1.0-experimental.3` so installed copies can update. It adds explicit `movie-ipcloud` and `tv-ipcloud` alternatives for the current `source.url` HLS response shape, validates the selected provider identity, maps response subtitles to their advertised format, and prioritizes English labels. The definition admits only the exact media origins observed during these probes; playlist-listed hosts remain subject to the existing bounded origin policy. Definition SHA-256: `d5fa9c15d91cedd2036d57cee01db4c3b04ac8ea19fb9e4a7160085ac7e92154`.

The current default `auto` response is still handled by the existing MovieBox `source.qualities` route. The IPCloud alternatives provide a separately addressable fallback. No source route or version was published by this work.

## Bounded live route inspection

The actual installed Downloads definition was loaded and the production `resolveDataModuleStream` path was used. Probes were limited to one title/episode and one movie; responses were capped at 2 MB each / 16 MB total and the request count at 36. Only catalog/API and playlist/inspection requests were made. No media segments, subtitle files, or complete direct-file media were transferred. No URLs, query strings, headers, or response bodies are recorded here.

| Sample | Route | Inspection result | Captions |
| --- | --- | --- | --- |
| The Mentalist, S1E1 | IPCloud HLS | 271 segments; 2709.165 s against 2700 s source runtime; one 1280×720 variant | API advertised 89 VTT rows; 64 metadata rows surfaced under the existing Host cap, English labels first |
| Inception | IPCloud HLS | 889 segments; 8888.046 s against 8880 s source runtime; one 1280×536 variant | No caption rows |

The IPCloud TV + movie pass used 13 requests and read 555,267 bytes; all responses were HTTP 200. Hosts were tracked internally for the origin policy check and are omitted here.

A separate all-alternatives pass confirmed the default `auto` result currently advertises MovieBox MP4 qualities: TV 1080p/720p/480p/360p and the sampled movie 1080p. The production resolver accepted the first file candidate after bounded range/MIME inspection. That pass used 11 requests and read 270,432 bytes (9 HTTP 200, 2 HTTP 206). This establishes metadata and file-type inspection only; it is not a complete transfer, decode, or physical playback result.

## Local test

`node --import tsx --test native/tests/moviedb-alpha-downloads.test.ts` passed 39/39 tests. The new fixtures cover the beta.14 IPCloud object shape, exact provider identity, HLS quality inspection, bounded VTT ordering/cap, origin rejection, and preservation of module identity.
