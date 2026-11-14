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
const { resolveDataModuleStream } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/modules/contentResolution.ts')).href);
const load = stem => parseContentModuleDefinition(readFileSync(new URL(`../modules-data/${stem}.smod.json`, import.meta.url), 'utf8'));
const anime = load('synthetiq-anime');
const flux = load('synthetiq-flux');
const ids = definition => definition.capabilities.download.alternatives.map(route => route.id);

// mode.embedAudio: audio named by the returned MegaPlay embed path (null = no embed offered)
// mode.kotoSources: whether Koto returns direct proxy tokens for the requested audio
// mode.runtime: episode row runtime in minutes (null = field absent; default 24)
// mode.mediaSeconds: total playlist duration served for every media playlist (default 6)
// mode.titleDuration: title-level browse duration in minutes (default 24)
function fixture(mode = {}) {
  const calls = [];
  const mediaSeconds = mode.mediaSeconds ?? 6;
  const playlist = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n' +
    Array.from({ length: Math.ceil(mediaSeconds / 6) }, (_, i) => `#EXTINF:${Math.min(6, mediaSeconds - i * 6)}.0,\nseg${i}.ts\n`).join('') + '#EXT-X-ENDLIST\n';
  const episode = number => mode.runtime === null ? { number, slug: 'exact-fixture' } : { number, slug: 'exact-fixture', runtime: mode.runtime ?? 24 };
  const json = (url, data, status = 200) => ({ ok: status < 400, status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), finalUrl: url });
  const text = (url, body) => ({ ok: true, status: 200, headers: { 'content-type': 'application/vnd.apple.mpegurl' }, body, finalUrl: url });
  const http = async request => {
    const url = new URL(request.url); calls.push(url);
    if (url.origin === 'https://graphql.anilist.co')
      return json(request.url, { data: { Media: { id: 101, idMal: 1001, title: { romaji: 'Exact fixture', native: 'Exact fixture' } } } });
    if (url.pathname === '/api/media/anime/browse')
      return json(request.url, { data: [{ anilistId: 999, slug: 'other' }, { anilistId: 101, slug: 'exact-fixture', duration: mode.titleDuration ?? 24, dubCount: 12 }] });
    if (url.pathname === '/api/media/anime/exact-fixture/episodes')
      return json(request.url, [episode(1), episode(2)]);
    if (url.pathname === '/api/media/anime/exact-fixture/episodes/2/sources') {
      const lang = url.searchParams.get('lang');
      if (url.searchParams.get('provider') !== 'koto') return json(request.url, { error: 'unknown provider' }, 400);
      const embedAudio = mode.embedAudio === undefined ? lang : mode.embedAudio;
      // Live shape (2026-11-14) when AniKage has no stream for this audio: explicit empty
      // arrays and no embedOptions key at all.
      if (mode.noStreamFor === lang)
        return json(request.url, { sources: [], subtitles: [], intro: { start: 0, end: 0 }, outro: { start: 0, end: 0 } });
      const body = {
        sources: mode.kotoSources === false ? [] : [{ url: `TOKEN-${lang}`, quality: 'HD-1', label: 'HD-1', isM3U8: true }],
        subtitles: [{ file: `CAP-${lang}`, label: 'English', kind: 'captions', default: true }, { file: 'THUMBS', kind: 'thumbnails' }],
        intro: { start: 1, end: 90 },
        embedOptions: embedAudio === null ? [] : [{ key: 'koto', label: 'E-Koto', url: `https://megaplay.buzz/stream/s-2/77/${embedAudio}?s=tcdn` }],
      };
      // Contract drift: a renamed field or a wrongly typed list.
      if (mode.rename) { body[mode.rename.to] = body[mode.rename.from]; delete body[mode.rename.from]; }
      if (mode.sourcesObject) body.sources = { url: `TOKEN-${lang}` };
      return json(request.url, body);
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
      return text(request.url, playlist);
    return json(request.url, {}, 502);
  };
  const api = createContentModuleApi(http);
  return { api, calls, http };
}

test('dead AniKage providers, dead Vidhawk routes and echo-identity legacy routes are no longer requested', () => {
  // Vidhawk (flow/zuri) was measured dead on 2026-11-14: uncached resolves hang past the
  // 12 s request timeout and cached tickets return HTTP 502 for every playlist.
  // Anime `megaplay` / Flux `anikage` required slug/number/subType echoes that the live
  // sources response no longer carries, so they failed every request unclassified.
  assert.deepEqual(ids(anime), ['anikage-megaplay', 'anikage', 'anikage-megaplay-2']);
  assert.deepEqual(ids(flux), ['anikage-megaplay', 'anikage-koto-dub', 'anikage-megaplay-2']);
  for (const definition of [anime, flux])
    for (const route of definition.capabilities.download.alternatives)
      for (const step of route.steps)
        assert.equal((step.responseMatches ?? []).some(rule => ['slug', 'number', 'subType'].includes(rule.path)), false, route.id);
  for (const definition of [anime, flux]) {
    const text = JSON.stringify(definition.capabilities.download);
    for (const provider of ['dib', 'neko', 'wave', 'zen']) assert.equal(text.includes(`"provider":"${provider}"`), false, provider);
  }
  for (const definition of [anime, flux]) {
    const routes = definition.capabilities.download.alternatives;
    assert.equal(routes.some(route => route.steps.some(step => /vidhawk/.test(step.request.origin))), false, `${definition.id} has no Vidhawk route`);
  }
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
    assert.equal(f.calls.some(url => url.origin === 'https://vidhawk.buzz'), false, 'no Vidhawk request');
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

for (const [name, definition, href] of [
  ['Anime', anime, 'anicrowd:101:2'],
  ['Flux', flux, 'flux:101:2'],
]) for (const language of ['sub', 'dub']) {
  test(`${name} ${language.toUpperCase()} with no AniKage source fails without contacting Vidhawk`, async () => {
    const f = fixture({ kotoSources: false, embedAudio: null });
    await assert.rejects(f.api.download(definition, href, language));
    assert.equal(f.calls.some(url => url.origin === 'https://vidhawk.buzz'), false);
  });
}

// Failure classification. Host 17 can only call a route definite from the final response
// mapping; the DUB audio proof (embed path names DUB) is an earlier extractUrl that throws a
// contract error when the provider omits embedOptions, so the no-stream DUB case is still
// reported invalid. The todo tests state the wanted outcome for a future host operation.
async function failuresFor(definition, href, language, mode) {
  const f = fixture(mode);
  const failures = [];
  const result = await f.api.download(definition, href, language, { onFailure: failure => failures.push(failure) })
    .then(() => 'resolved', error => error);
  return { result, failures, calls: f.calls };
}
const definite = failure => failure.code === 'REQUESTED_VARIANT_NO_ROUTE' || failure.reason === 'no-compatible-source';

for (const [name, definition, href] of [
  ['Anime', anime, 'anicrowd:101:2'],
  ['Flux', flux, 'flux:101:2'],
]) {
  test(`${name} SUB explicit empty sources reads definite on the primary SUB route`, async () => {
    const { result, failures, calls } = await failuresFor(definition, href, 'sub', { noStreamFor: 'sub' });
    assert.notEqual(result, 'resolved');
    const primary = failures.find(failure => failure.alternativeId === 'anikage-megaplay');
    assert.equal(primary.code, 'REQUESTED_VARIANT_NO_ROUTE');
    assert.equal(calls.some(url => url.searchParams.get('lang') === 'dub'), false);
  });

  test(`${name} DUB explicit empty sources fails closed, never as SUB, without extra requests`, async () => {
    const { result, failures, calls } = await failuresFor(definition, href, 'dub', { noStreamFor: 'dub' });
    assert.notEqual(result, 'resolved');
    assert.ok(failures.length >= 1);
    assert.equal(calls.some(url => url.searchParams.get('lang') === 'sub' || url.searchParams.get('type') === 'sub'), false);
    assert.equal(calls.some(url => url.origin === 'https://megaplay.buzz'), false, 'no embed is followed');
    // Every AniKage route reuses the one cached sources response.
    assert.equal(calls.filter(url => url.pathname.endsWith('/sources')).length, 1);
  });

  test(`${name} DUB explicit empty sources reads definite no-compatible-source`,
    { todo: 'needs a host step operation that treats an explicit empty `sources` array as definite before extractUrl' }, async () => {
      const { failures } = await failuresFor(definition, href, 'dub', { noStreamFor: 'dub' });
      assert.ok(failures.length && failures.every(definite), JSON.stringify(failures));
    });

  test(`${name} DUB renamed embed field reads invalid, not unavailable`, async () => {
    const { result, failures } = await failuresFor(definition, href, 'dub', { rename: { from: 'embedOptions', to: 'embeds' } });
    assert.notEqual(result, 'resolved');
    assert.ok(failures.length && failures.every(failure => failure.reason === 'invalid'), JSON.stringify(failures));
  });

  for (const language of ['sub', 'dub'])
    test(`${name} ${language.toUpperCase()} wrongly typed sources reads invalid`, async () => {
      // The embed still names the requested audio, so only the sources contract differs
      // (the MegaPlay backup may still serve under its own identity checks).
      const { failures } = await failuresFor(definition, href, language, { sourcesObject: true });
      const direct = failures.find(failure => failure.alternativeId === (language === 'sub' ? 'anikage-megaplay' : definition === anime ? 'anikage' : 'anikage-koto-dub'));
      assert.equal(direct?.reason, 'invalid', JSON.stringify(failures));
      assert.equal(failures.some(definite), false, JSON.stringify(failures));
    });

  test(`${name} SUB renamed sources field reads invalid`,
    { todo: 'host 17 treats an absent array candidate source like null (definite); needs a required candidate-source flag' }, async () => {
      const { failures } = await failuresFor(definition, href, 'sub', { rename: { from: 'sources', to: 'streams' }, embedAudio: null });
      const direct = failures.find(failure => failure.alternativeId === 'anikage-megaplay');
      assert.equal(direct?.reason, 'invalid', JSON.stringify(failures));
    });

  test(`${name} normal DUB still resolves with no failures`, async () => {
    const { result, failures } = await failuresFor(definition, href, 'dub', {});
    assert.equal(result, 'resolved');
    assert.deepEqual(failures, []);
  });
}

// Expected duration comes from the exact episode row's runtime (same host tolerance:
// |media - expected| <= max(90 s, 10%)). Host 17 expectedDuration takes one path, so a row
// without runtime has no expected duration and the AniKage route fails closed (invalid).
const mapSubtitles = tracks => tracks.map(track => ({ id: track.id, label: track.label ?? '', url: track.url ?? '', languageTag: track.language ?? 'en', format: 'auto', forced: false, sdh: false }));
async function inspectEpisode(definition, href, language, mode) {
  const f = fixture(mode);
  const failures = [];
  const result = await resolveDataModuleStream({ api: f.api, definition, href, language, http: f.http, mapSubtitles,
    onTrace: event => { if (event.outcome === 'failed' && event.alternativeId) failures.push(event); } })
    .then(resolved => resolved, error => error);
  return { result, failures, calls: f.calls };
}
const durationReasons = failures => failures.filter(failure => failure.reason === 'duration').map(failure => failure.alternativeId);

test('every AniKage route reads its expected duration from the exact episode row', () => {
  for (const definition of [anime, flux])
    for (const route of definition.capabilities.download.alternatives) {
      assert.deepEqual(route.expectedDuration, { step: 2, path: 'selectedEpisode.runtime', unit: 'minutes' }, route.id);
      assert.equal(route.steps[2].jsonRowSelect.resultField, 'selectedEpisode');
      assert.equal(route.steps[2].jsonRowSelect.parameter, 'episodeNumber');
    }
});

for (const [name, definition, href] of [
  ['Anime', anime, 'anicrowd:101:2'],
  ['Flux', flux, 'flux:101:2'],
]) for (const language of ['sub', 'dub']) {
  const label = `${name} ${language.toUpperCase()}`;
  test(`${label} double-length premiere (runtime 47, media 47 min, title 24) is accepted`, async () => {
    const { result } = await inspectEpisode(definition, href, language, { runtime: 47, mediaSeconds: 47 * 60 });
    assert.ok(!(result instanceof Error), String(result?.message));
    assert.equal(result.stream.url, `https://og.bakayaro.live/TOKEN-${language}`);
  });

  test(`${label} normal 24-minute episode serving 47-minute media is still rejected`, async () => {
    const { result, failures } = await inspectEpisode(definition, href, language, { runtime: 24, mediaSeconds: 47 * 60 });
    assert.ok(result instanceof Error);
    assert.ok(durationReasons(failures).length >= 1, JSON.stringify(failures));
  });

  test(`${label} normal episode within tolerance is accepted (runtime 24, media 24.5 min)`, async () => {
    const { result } = await inspectEpisode(definition, href, language, { runtime: 24, mediaSeconds: 24 * 60 + 30 });
    assert.ok(!(result instanceof Error), String(result?.message));
  });

  test(`${label} row without runtime never accepts media (fails closed as invalid, no media request)`, async () => {
    for (const mediaSeconds of [24 * 60, 47 * 60]) {
      const { result, failures, calls } = await inspectEpisode(definition, href, language, { runtime: null, mediaSeconds });
      assert.ok(result instanceof Error, `media ${mediaSeconds}s must not be accepted without an episode runtime`);
      assert.ok(failures.length && failures.every(failure => failure.reason === 'invalid'), JSON.stringify(failures));
      assert.equal(calls.some(url => url.origin === 'https://og.bakayaro.live' && !url.pathname.startsWith('/CAP')), false, 'no playlist inspected');
    }
  });
}
