# Source repair — 14 November 2026

Synthetiq Anime 1.3.16 and Synthetiq Flux 1.0.0-experimental.7 (Host 16).

- Removed the routes to a provider that no longer answers. Uncached titles hung
  for the full request timeout, adding about 12 seconds before another source
  was tried. A saved manual selection of a removed server is reported as no
  longer available; nothing is substituted.
- Removed two legacy routes that required response fields the provider no longer
  returns.
- Episode length is compared with the episode's own stated runtime, with the
  same tolerance. An episode without a stated runtime is not served by these
  routes.

Evidence is workstation inspection and four complete transfers recorded in the
Downloads app report `docs/feedback-2026-11-14/REPORT.md`; not phone acceptance.
Known gap: a provider "no stream for this audio" answer is still reported as a
failed source, because the provider omits the field the DUB proof reads.
