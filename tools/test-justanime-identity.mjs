// Run with the Downloads app's tsx: DOWNLOADS_APP_ROOT=/path/to/app npx tsx --test /path/to/this-file.mjs
// Fixtures mirror the observed JustAnime JSON shapes (AniList-backed `id`, details `idMal`).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

if (!process.env.DOWNLOADS_APP_ROOT) throw Error('Set DOWNLOADS_APP_ROOT to the Downloads app checkout');
const { createContentModuleApi, parseContentModuleDefinition } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/core/content-module.ts')).href);
const definition = parseContentModuleDefinition(readFileSync(new URL('../modules-data/justanime-downloads.smod.json', import.meta.url), 'utf8'));

const rows = [
  { id: 5680, title: { english: 'K-ON!', romaji: 'K-ON!' }, cover: 'https://s4.anilist.co/c/bx5680.png', type: 'TV', year: 2009 },
  { id: 7791, title: { english: 'K-ON! Season 2', romaji: 'K-ON!!' }, cover: 'https://s4.anilist.co/c/bx7791.png', type: 'TV', year: 2010 },
  { id: 'not-a-number', title: { english: 'Malformed' }, type: 'TV', year: 2009 },
];
const detail = { id: 5680, idMal: 5680, title: { english: 'K-ON!', romaji: 'K-ON!' }, format: 'TV', seasonYear: 2009, episodes: 13 };

function api({ primaryFails = false, omitMal = false } = {}) {
  const calls = [];
  const json = (request, data, status = 200) => ({ ok: status < 300, status, headers: {}, body: JSON.stringify(data), finalUrl: request.url });
  return { calls, api: createContentModuleApi(async request => {
    const url = new URL(request.url); calls.push(url);
    assert.equal(url.hostname, 'core.justanime.to');
    // Full search is primary: its results include titles the five-row suggestions omit.
    if (url.pathname === '/api/search') return primaryFails ? json(request, {}, 503) : json(request, { results: rows, pageInfo: { total: rows.length } });
    if (url.pathname === '/api/search/suggestions') return json(request, { data: rows.slice(0, 5) });
    if (url.pathname === '/api/anime/5680') return json(request, { data: omitMal ? { ...detail, idMal: undefined } : detail });
    throw Error(`unexpected ${url.pathname}`);
  }) };
}

test('search rows carry the provider-stated AniList id; seasons stay distinct', async () => {
  for (const options of [{}, { primaryFails: true }]) {
    const results = await api(options).api.search(definition, 'K-On!');
    const kon = results.find(r => r.href === 'https://justanime.to/anime/5680');
    const kon2 = results.find(r => r.href === 'https://justanime.to/anime/7791');
    assert.equal(kon.anilistId, 5680);
    assert.equal(kon.year, 2009);
    assert.equal(kon.format, 'TV');
    assert.equal(kon.malId, undefined, 'search rows never claim a MAL id the provider did not state');
    assert.equal(kon2.anilistId, 7791);
    assert(results.every(r => r.anilistId === undefined || Number.isSafeInteger(r.anilistId)));
    assert.equal(results.find(r => r.title === 'Malformed')?.anilistId, undefined);
  }
});

test('full search is tried first and suggestions only after it fails', async () => {
  const ok = api(); await ok.api.search(definition, 'K-On!');
  assert.deepEqual(ok.calls.map(u => u.pathname), ['/api/search']);
  const failed = api({ primaryFails: true }); await failed.api.search(definition, 'K-On!');
  assert.deepEqual(failed.calls.map(u => u.pathname), ['/api/search', '/api/search/suggestions']);
});

test('details expose idMal only as the explicit MAL external id', async () => {
  const details = await api().api.details(definition, 'https://justanime.to/anime/5680');
  assert.equal(details.externalId, 5680);
  assert.equal(details.year, 2009);
  assert.equal(details.format, 'TV');
  const missing = await api({ omitMal: true }).api.details(definition, 'https://justanime.to/anime/5680');
  assert.equal(missing.externalId, undefined, 'no MAL id is inferred when the provider omits idMal');
});
