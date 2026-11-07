# Default catalogue publication — 7 November 2026

Owner-authorized publication of the previously reviewed Host 16 candidate
(commit 7e6987b2f812d75c2fe6feab5000afd5367904a4). Definition bytes and catalogue
hashes are unchanged from that candidate. All ten entries parse in the actual
Downloads host and are compatible with app 1.0.148/build149. No executable module,
credential, signed media URL or customer data is included.

App hardening: [d6b5ccd](https://github.com/kas021/synthetiq-downloads/commit/d6b5ccdc775f0c72eb70b977cd613b43198d8819).
The app records 1,976 passing tests/one existing skip and ten complete isolated
Mac download runs across eight title/episode/audio cases. These include the
reported To Your Eternity E1–E3 DUB, E1 SUB, FMA 2003 E1 DUB, K-On E1 DUB,
One Piece E1101 direct/controlled alternate, and Inception with separate audio.
Hashes and full local decode pass; the final E2 DUB rerun also passes.

Caption coverage varies: To Your Eternity DUB exposes only a few English cues,
its SUB route has 239 parsed packets, and K-On DUB/movie routes supply none.
Intermittent DNS and external availability failures remain. Joe2 DUB,
Brotherhood and sampled KickAssAnime paths are not certified by these results.

The owner authorized the default catalogue push and an in-place Pixel update.
Physical native download/fallback/audio/caption/offline acceptance is a separate
app-side record, not established by this publication. No monthly event, account,
wallet or store configuration is changed. Keep old module references and minimum
app/host compatibility requirements intact for rollback and older clients.
