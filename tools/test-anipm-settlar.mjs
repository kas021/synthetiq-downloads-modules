// Run with the Downloads app's tsx: DOWNLOADS_APP_ROOT=/path/to/app npx tsx --test /path/to/this-file.mjs
// Offline fixture: synthetic opaque values only; response shapes mirror the reviewed Settlar flow.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

if (!process.env.DOWNLOADS_APP_ROOT) throw Error('Set DOWNLOADS_APP_ROOT to the Downloads app checkout');
const { createContentModuleApi, parseContentModuleDefinition } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/core/content-module.ts')).href);
const raw = readFileSync(new URL('../modules-data/anipm-downloads.smod.json', import.meta.url), 'utf8');
const definition = parseContentModuleDefinition(raw);
const href = 'https://ani.pm/anime/1610/episode/1?sourceEp=1';
const SELECTION = 'fixture-selection.Opaque_value-0123456789';
const TOKEN = 'fixture-token.Opaque_value-9876543210';

function fixture({ embedAudio, embedUrl, availability = { sub: true, dub: true } } = {}) {
  const calls = [];
  const api = createContentModuleApi(async request => {
    const url = new URL(request.url); calls.push(url);
    const json = data => ({ ok: true, status: 200, headers: {}, body: JSON.stringify(data), finalUrl: request.url });
    if (url.pathname === '/api/anime/series/1610') return json({ id: 1610, source: 'settlar' });
    if (url.pathname === '/api/anime/playback-bootstrap/settlar/1610') {
      const lang = url.searchParams.get('lang');
      return json({ id: 1610, episode: Number(url.searchParams.get('ep')), requestedLanguage: lang, effectiveLanguage: lang,
        availability, settlarSelection: SELECTION, backupEmbed: { available: false, reason: 'unavailable' } });
    }
    if (url.pathname === '/api/anime/settlar/session') {
      assert.equal(url.searchParams.get('selection'), SELECTION);
      assert.equal(url.searchParams.get('provider'), 'anipm');
      assert.equal(url.searchParams.get('ep'), '1');
      return json({ provider: 'anipm', embedUrl: embedUrl ?? `https://embed.settlar.io/embed/v1?t=${TOKEN}` });
    }
    if (url.origin === 'https://embed.settlar.io' && url.pathname === '/api/embed/session') {
      assert.equal(url.searchParams.get('t'), TOKEN, 'captured token is bound into the session request');
      const channel = calls.find(call => call.pathname === '/api/anime/settlar/session').searchParams.get('channel');
      const audioLang = embedAudio ?? (channel === 'dub' ? 'en' : 'ja');
      return json({ provider: 'anipm', kind: 'hls', audioLang, source: `https://media.settlar.io/v1/${channel}/master`,
        subtitles: [{ url: `https://media.settlar.io/v1/${channel}/en-captions`, label: 'English', srclang: 'en', default: true }] });
    }
    return { ok: false, status: 404, headers: {}, body: '', finalUrl: request.url };
  });
  return { api, calls };
}

for (const variant of ['sub', 'dub']) {
  test(`Settlar ${variant.toUpperCase()} resolves exact audio with mapped captions; MegaPlay is not reached`, async () => {
    const f = fixture();
    const result = await f.api.download(definition, href, variant);
    assert.equal(result.candidates[0].url, `https://media.settlar.io/v1/${variant}/master`);
    assert.equal(result.candidates[0].audioLanguage, variant === 'sub' ? 'jpn' : 'en');
    assert.equal(result.subtitles[0].url, `https://media.settlar.io/v1/${variant}/en-captions`);
    assert.equal(result.subtitles[0].language, 'en');
    assert(!f.calls.some(url => url.hostname === 'megaplay.buzz'));
    assert.equal(f.calls.filter(url => url.pathname.startsWith('/api/anime/playback-bootstrap')).length, 1);
    assert.equal(JSON.stringify(result).includes(TOKEN), false);
  });
}

test('wrong Settlar audio language never satisfies the requested variant', async () => {
  const f = fixture({ embedAudio: 'ja' });
  await assert.rejects(f.api.download(definition, href, 'dub'));
});

test('an embed URL on another origin is rejected before the session request; MegaPlay fails fast', async () => {
  const f = fixture({ embedUrl: `https://other.settlar.io/embed/v1?t=${TOKEN}` });
  await assert.rejects(f.api.download(definition, href, 'sub'));
  assert(!f.calls.some(url => url.pathname === '/api/embed/session'));
  assert(!f.calls.some(url => url.hostname === 'megaplay.buzz'), 'unavailable backup embed is never followed');
});

test('unavailable audio availability fails as unavailable without session requests', async () => {
  const f = fixture({ availability: { sub: true, dub: false } });
  await assert.rejects(f.api.download(definition, href, 'dub'));
  assert(!f.calls.some(url => url.pathname === '/api/anime/settlar/session'));
});
