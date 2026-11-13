// Run with the Downloads app's tsx: DOWNLOADS_APP_ROOT=/path/to/app npx tsx --test /path/to/this-file.mjs
// Fixture shapes mirror the AniKage/MegaPlay responses observed on 2026-11-13 (synthetic IDs and hosts only).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createCipheriv } from 'node:crypto';

if (!process.env.DOWNLOADS_APP_ROOT) throw Error('Set DOWNLOADS_APP_ROOT to the Downloads app checkout');
const { createContentModuleApi, parseContentModuleDefinition } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/core/content-module.ts')).href);
const load = stem => parseContentModuleDefinition(readFileSync(new URL(`../modules-data/${stem}.smod.json`, import.meta.url), 'utf8'));
const anime = load('synthetiq-anime');
const flux = load('synthetiq-flux');
const ids = definition => definition.capabilities.download.alternatives.map(route => route.id);

// mode.embedAudio: audio named by the returned MegaPlay embed path (null = no embed offered)
// mode.kotoSources: whether Koto returns direct proxy tokens for the requested audio
function fixture(mode = {}) {
  const calls = [];
  const json = (url, data, status = 200) => ({ ok: status < 400, status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), finalUrl: url });
  const text = (url, body) => ({ ok: true, status: 200, headers: { 'content-type': 'application/vnd.apple.mpegurl' }, body, finalUrl: url });
  const api = createContentModuleApi(async request => {
    const url = new URL(request.url); calls.push(url);
    if (url.origin === 'https://graphql.anilist.co')
      return json(request.url, { data: { Media: { id: 101, idMal: 1001, title: { romaji: 'Exact fixture', native: 'Exact fixture' } } } });
    if (url.pathname === '/api/media/anime/browse')
      return json(request.url, { data: [{ anilistId: 999, slug: 'other' }, { anilistId: 101, slug: 'exact-fixture', duration: 24, dubCount: 12 }] });
    if (url.pathname === '/api/media/anime/exact-fixture/episodes')
      return json(request.url, [{ number: 1, slug: 'exact-fixture' }, { number: 2, slug: 'exact-fixture' }]);
    if (url.pathname === '/api/media/anime/exact-fixture/episodes/2/sources') {
      const lang = url.searchParams.get('lang');
      if (url.searchParams.get('provider') !== 'koto') return json(request.url, { error: 'unknown provider' }, 400);
      const embedAudio = mode.embedAudio === undefined ? lang : mode.embedAudio;
      // Current shape: no slug/number/subType echo; sources are relative proxy tokens.
      return json(request.url, {
        sources: mode.kotoSources === false ? [] : [{ url: `TOKEN-${lang}`, quality: 'HD-1', label: 'HD-1', isM3U8: true }],
        subtitles: [{ file: `CAP-${lang}`, label: 'English', kind: 'captions', default: true }, { file: 'THUMBS', kind: 'thumbnails' }],
        intro: { start: 1, end: 90 },
        embedOptions: embedAudio === null ? [] : [{ key: 'koto', label: 'E-Koto', url: `https://megaplay.buzz/stream/s-2/77/${embedAudio}?s=tcdn` }],
      });
    }
    if (url.origin === 'https://megaplay.buzz' && url.pathname.startsWith('/stream/s-2/77/'))
      return { ok: true, status: 200, headers: {}, body: `<div class="fix-area" id="megaplay-player" data-id="${url.pathname.endsWith('/dub') ? 5552 : 5551}" data-realid="77"></div>`, finalUrl: request.url };
    if (url.origin === 'https://megaplay.buzz' && url.pathname === '/stream/getSourcesNew') {
      const spec = anime.capabilities.download.alternatives.find(route => route.id === 'anikage-megaplay-2').steps.at(-1).response;
      const cipher = createCipheriv('aes-256-cbc', Buffer.from(spec.keyHex, 'hex'), Buffer.from(spec.ivHex, 'hex'));
      const file = `https://fetch.nexabloom.top/file-${url.searchParams.get('id')}/master.m3u8`;
      return json(request.url, { tracks: [{ file: 'https://megaplay.buzz/en.vtt', label: 'English', kind: 'captions' }],
        enc: Buffer.concat([cipher.update(JSON.stringify({ file })), cipher.final()]).toString('base64url') });
    }
    if (url.origin === 'https://vidhawk.buzz') return json(request.url, { error: 'unavailable' }, 502);
    if (url.origin === 'https://og.bakayaro.live' || url.origin === 'https://fetch.nexabloom.top')
      return text(request.url, '#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nseg.ts\n#EXT-X-ENDLIST\n');
    return json(request.url, {}, 502);
  });
  return { api, calls };
}

test('dead AniKage providers are no longer requested and Flux stays Vidhawk-labelled', () => {
  assert.deepEqual(ids(anime), ['anikage-megaplay', 'anikage', 'anikage-megaplay-2', 'flow', 'zuri', 'megaplay']);
  for (const definition of [anime, flux]) {
    const text = JSON.stringify(definition.capabilities.download);
    for (const provider of ['dib', 'neko', 'wave', 'zen']) assert.equal(text.includes(`"provider":"${provider}"`), false, provider);
  }
  assert.ok(ids(flux).includes('flow') && ids(flux).includes('zuri') && ids(flux).includes('anikage-koto-dub'));
  const dub = anime.capabilities.download.alternatives.find(route => route.id === 'anikage');
  assert.deepEqual(dub.variants, ['dub']);
});

for (const [name, definition, href] of [
  ['Anime', anime, 'anicrowd:101:2'],
  ['Flux', flux, 'flux:101:2'],
]) {
  test(`${name} DUB resolves the exact Koto DUB token only when the embed path names DUB`, async () => {
    const f = fixture();
    const result = await f.api.download(definition, href, 'dub');
    assert.equal(result.candidates[0].url, 'https://og.bakayaro.live/TOKEN-dub');
    assert.deepEqual(result.subtitles.map(track => track.url), ['https://og.bakayaro.live/CAP-dub']);
    assert.equal(f.calls.some(url => url.searchParams.get('lang') === 'sub'), false, 'a DUB request never asks for SUB');
    assert.equal(f.calls.some(url => url.origin === 'https://vidhawk.buzz' && name === 'Anime'), false, 'Anime does not wait on Vidhawk once a DUB route exists');
  });

  test(`${name} DUB is never served from a SUB-labelled embed`, async () => {
    const f = fixture({ embedAudio: 'sub' });
    await assert.rejects(f.api.download(definition, href, 'dub'));
    assert.equal(f.calls.some(url => url.pathname === '/stream/getSourcesNew'), false);
  });

  test(`${name} missing DUB fails as unavailable instead of falling back to SUB`, async () => {
    const f = fixture({ kotoSources: false, embedAudio: null });
    await assert.rejects(f.api.download(definition, href, 'dub'));
    assert.equal(f.calls.some(url => url.searchParams.get('lang') === 'sub' || url.searchParams.get('audio') === 'sub'), false);
  });

  test(`${name} MegaPlay backup resolves the DUB embed's own file id`, async () => {
    const f = fixture({ kotoSources: false });
    const result = await f.api.download(definition, href, 'dub');
    assert.equal(result.candidates[0].url, 'https://fetch.nexabloom.top/file-5552/master.m3u8');
    const sourcesCall = f.calls.find(url => url.pathname === '/stream/getSourcesNew');
    assert.equal(sourcesCall.searchParams.get('id'), '5552');
    assert.equal(sourcesCall.searchParams.get('type'), 'dub');
  });
}

test('Anime SUB keeps the exact Koto SUB route', async () => {
  const f = fixture();
  const result = await f.api.download(anime, 'anicrowd:101:2', 'sub');
  assert.equal(result.candidates[0].url, 'https://og.bakayaro.live/TOKEN-sub');
  assert.equal(f.calls.some(url => url.searchParams.get('lang') === 'dub'), false);
});
