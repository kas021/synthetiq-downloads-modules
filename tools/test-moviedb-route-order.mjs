// Run with the Downloads app's tsx: DOWNLOADS_APP_ROOT=/path/to/app npx tsx --test /path/to/this-file.mjs
// Fixture shapes mirror the provider responses observed on 2026-11-15 (synthetic IDs and hosts only):
// the VidLove API name no longer resolves; Vidrock answers with an encrypted row per server.
import assert from 'node:assert/strict';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

if (!process.env.DOWNLOADS_APP_ROOT) throw Error('Set DOWNLOADS_APP_ROOT to the Downloads app checkout');
const { createContentModuleApi, parseContentModuleDefinition, contentMetadataTitleHref } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/core/content-module.ts')).href);
const text = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const raw = JSON.parse(text('modules-data/moviedb-downloads.smod.json'));
const definition = parseContentModuleDefinition(text('modules-data/moviedb-downloads.smod.json'));
const routes = definition.capabilities.download.alternatives;
const keyHex = raw.capabilities.download.alternatives.find(route => route.id === 'fallback-vidrock-movie').steps[1].response.keyHex;
const seal = url => {
  const nonce = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), nonce);
  return Buffer.concat([nonce, cipher.update(url, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64url');
};
const empty = { url: '', language: '', flag: '', type: '' };

function provider(mode = {}) {
  const calls = [];
  const http = async request => {
    const url = new URL(request.url); calls.push(url);
    const reply = (body, type) => ({ ok: true, status: 200, headers: { 'content-type': type }, body, bodyBytes: body.length, finalUrl: request.url });
    if (url.origin === 'https://www.moviedb.wiki' && url.pathname === '/home/movie/4242')
      return reply(`<html><body><script id="titleData" type="application/json">${JSON.stringify({ id: 4242, type: 'movie', title: 'Fixture film', runtime: 15 })}</script></body></html>`, 'text/html');
    if (url.origin === 'https://vidrock.net' && url.pathname === '/api/movie/4242')
      return reply(JSON.stringify({
        Atlas: mode.atlas === false ? empty : { url: seal('https://cdn2.slowcloud.live/movie/fixture/index.m3u8'), language: 'English', flag: 'us', type: 'hls' },
        // A rotating host outside the declared set: never admitted, never requested.
        Orion: { url: seal('https://undeclared-rotating-host.example.org/file1/fixture/master.m3u8'), language: 'English', flag: 'us', type: 'hls' },
        Luna: empty,
      }), 'application/json');
    if (url.origin === 'https://api.vidlove.cc') throw Object.assign(new TypeError('fetch failed'), { cause: Object.assign(Error('getaddrinfo ENOTFOUND api.vidlove.cc'), { code: 'ENOTFOUND' }) });
    throw Error(`unexpected request ${url.origin}${url.pathname}`);
  };
  return { calls, api: createContentModuleApi(http) };
}
const href = contentMetadataTitleHref(definition, 4242, 'movie');
const movieHref = async api => (await api.episodesWindow(definition, href, 'original', { startEpisode: 1, limit: 1 })).items[0].href;

test('MovieDB experimental.7: identity, floors and catalogue entry', () => {
  assert.equal(definition.version, '0.1.0-experimental.7');
  assert.deepEqual([definition.id, definition.moduleFamilyId, definition.moduleIdentity, definition.minHostVersion], ['moviedb-wiki-v1', 'moviedb_wiki_v1', 'SP-VID-083-MOVIEDB', 18]);
  const entry = JSON.parse(text('catalogue.json')).modules.find(module => module.file === 'modules-data/moviedb-downloads.smod.json');
  assert.equal(entry.sha256, createHash('sha256').update(readFileSync(new URL('../modules-data/moviedb-downloads.smod.json', import.meta.url))).digest('hex'), 'catalogue hash is of the exact published bytes');
  assert.deepEqual([entry.version, entry.minHostVersion, entry.minAppVersion], ['0.1.0-experimental.7', 18, '1.0.162']);
});

test('MovieDB: every route keeps its ID; the answering provider is tried before the unresolvable one', () => {
  // Saved manual server selections are keyed by these IDs: none may disappear or be renamed.
  assert.deepEqual(routes.map(route => route.id).sort(), ['fallback-vidrock-episode', 'fallback-vidrock-movie', 'movie-auto', 'movie-ipcloud', 'movie-megaknight', 'movie-vidapi', 'tv-auto', 'tv-ipcloud', 'tv-megaknight', 'tv-vidapi']);
  assert.deepEqual(routes.slice(0, 2).map(route => route.id), ['fallback-vidrock-movie', 'fallback-vidrock-episode']);
  const lastOrigin = route => route.steps[route.steps.length - 1].request.origin;
  assert.ok(routes.slice(0, 2).every(route => lastOrigin(route) === 'https://vidrock.net'));
  assert.ok(routes.slice(2).every(route => lastOrigin(route) === 'https://api.vidlove.cc'));
  // Identity, runtime and origin rules are untouched by the reorder.
  for (const route of routes) {
    assert.equal(route.responseMediaOrigins, true);
    assert.deepEqual(route.expectedDuration, { step: route.contentKinds[0] === 'movie' ? 0 : 1, path: route.expectedDuration.path, unit: 'minutes' });
    assert.ok(route.steps[0].responseMatches.some(rule => rule.path === 'id' && rule.parameter === 'contentId'));
  }
});

test('MovieDB: an accepted Vidrock candidate ends the attempt without touching the unresolvable host', async () => {
  const { api, calls } = provider();
  const inspected = [];
  const result = await api.download(definition, await movieHref(api), 'original', {
    acceptCandidate: candidate => { inspected.push(candidate); return true; }, stopAfterAcceptedCandidate: true });
  assert.equal(result.candidates.length, 1);
  assert.equal(new URL(result.candidates[0].url).origin, 'https://cdn2.slowcloud.live');
  assert.equal(result.candidates[0].expectedDurationSec, 900);
  assert.ok(inspected.every(candidate => new URL(candidate.url).origin === 'https://cdn2.slowcloud.live'), 'an undeclared rotating host is never offered');
  assert.ok(!calls.some(url => url.origin === 'https://api.vidlove.cc'));
});

test('MovieDB: when Vidrock has no admissible server the later routes are still attempted and the failure is not reported as empty', async () => {
  const { api, calls } = provider({ atlas: false });
  const failures = [];
  await assert.rejects(api.download(definition, await movieHref(api), 'original', {
    acceptCandidate: () => true, stopAfterAcceptedCandidate: true, onFailure: failure => failures.push(failure) }));
  assert.ok(calls.some(url => url.origin === 'https://api.vidlove.cc'), 'later routes still run');
  assert.equal(failures[0].alternativeId, 'fallback-vidrock-movie');
  assert.ok(failures.every(failure => failure.code !== 'REQUESTED_VARIANT_NO_ROUTE'), 'an unreachable host is never a definite "not available"');
});
