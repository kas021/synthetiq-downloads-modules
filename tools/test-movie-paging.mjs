// Run with the Downloads app's tsx: DOWNLOADS_APP_ROOT=/path/to/app npx tsx --test /path/to/this-file.mjs
// Fixture markup mirrors the provider's search page as observed on 2026-11-15 (synthetic IDs):
// unquoted attributes, varying page sizes, and a disabled "next" link on the last page.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

if (!process.env.DOWNLOADS_APP_ROOT) throw Error('Set DOWNLOADS_APP_ROOT to the Downloads app checkout');
const { CONTENT_HOST_VERSION, createContentModuleApi, parseContentModuleDefinition } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/core/content-module.ts')).href);
const text = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const STEMS = ['moviedb-downloads', 'alpha-movies-downloads'];
const load = stem => parseContentModuleDefinition(text(`modules-data/${stem}.smod.json`));

const SIZES = { 1: 17, 2: 11, 3: 20, 4: 4 };
const LAST = 4;
function provider() {
  const calls = [];
  const http = async request => {
    const url = new URL(request.url); calls.push(url);
    assert.equal(url.origin + url.pathname, 'https://www.moviedb.wiki/home/search');
    const page = Number(url.searchParams.get('page'));
    const cards = Array.from({ length: SIZES[page] ?? 0 }, (_, i) => {
      const id = page * 1000 + i;
      return `<article class=poster-card data-id=${id} data-title="Fixture ${id}" data-type=${i % 3 ? 'movie' : 'tv'} data-poster="https://image.tmdb.org/t/p/w342/f${id}.jpg"><a class=poster-link href="/home/${i % 3 ? 'movie' : 'tv'}/${id}"></a></article>`;
    }).join('');
    const q = encodeURIComponent(url.searchParams.get('q') ?? '');
    const nav = !SIZES[page] ? '' : `<nav class=pagination aria-label=Pagination>` +
      (page > 1 ? `<a class=page-link href="/home/search?q=${q}&amp;page=${page - 1}" rel=prev aria-label="Previous page">‹</a>` : `<a class="page-link is-disabled" href="#" rel=prev aria-label="Previous page">‹</a>`) +
      `<a class="page-link is-active" href="/home/search?q=${q}&amp;page=${page}" aria-current=page>${page}</a>` +
      (page < LAST ? `<a class=page-link href="/home/search?q=${q}&amp;page=${page + 1}" rel=next aria-label="Next page">›</a>` : `<a class="page-link is-disabled" href="#" rel=next aria-label="Next page">›</a>`) + `</nav>`;
    const body = `<!DOCTYPE html><html lang=en><head><link rel=canonical href="https://www.moviedb.wiki/home/search?q=${q}&amp;page=${page}"></head><body><nav class=primary-nav id=primaryNav></nav><main><div class=poster-grid>${cards}</div>${nav}</main><nav class=footer-links></nav></body></html>`;
    return { ok: true, status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, body, bodyBytes: body.length, finalUrl: request.url };
  };
  return { calls, api: createContentModuleApi(http) };
}

for (const stem of STEMS) {
  test(`${stem}: host 18 next-page marker, identity and catalogue entry`, () => {
    const definition = load(stem);
    assert.ok(CONTENT_HOST_VERSION >= 18, 'run against an app checkout with content host 18 or later');
    assert.equal(definition.version, '0.1.0-experimental.6');
    assert.equal(definition.minHostVersion, 18);
    assert.deepEqual(definition.capabilities.search.primary.pagination,
      { nextSelector: 'nav.pagination a[rel="next"]', nextDisabledSelector: 'nav.pagination a.is-disabled[rel="next"]' });
    // Saved references depend on these; paging must not move them.
    const identity = { 'moviedb-downloads': ['moviedb-wiki-v1', 'moviedb_wiki_v1', 'SP-VID-083-MOVIEDB'], 'alpha-movies-downloads': ['alpha-movies', 'alpha_movies_v1', 'SP-VID-079-ALPHA-MOVIES'] }[stem];
    assert.deepEqual([definition.id, definition.moduleFamilyId, definition.moduleIdentity], identity);
    const entry = JSON.parse(text('catalogue.json')).modules.find(module => module.file === `modules-data/${stem}.smod.json`);
    assert.equal(entry.sha256, createHash('sha256').update(readFileSync(new URL(`../modules-data/${stem}.smod.json`, import.meta.url))).digest('hex'), 'catalogue hash is of the exact published bytes');
    assert.deepEqual([entry.version, entry.minHostVersion, entry.minAppVersion], ['0.1.0-experimental.6', 18, '1.0.162']);
    // An app on an earlier host must refuse this definition rather than misread it.
    const lowered = JSON.parse(text(`modules-data/${stem}.smod.json`)); lowered.minHostVersion = 17;
    assert.throws(() => parseContentModuleDefinition(JSON.stringify(lowered)), /HTML next-page markers require minHostVersion 18 or later/);
  });

  test(`${stem}: browse continues page by page and stops at the provider's last page`, async () => {
    const definition = load(stem);
    const { api, calls } = provider();
    const seen = new Set(); const trail = [];
    let page = 1, sourceId, hasMore = true;
    while (hasMore) {
      const result = await api.searchPage(definition, '', page, sourceId);
      assert.equal(result.page, page);
      for (const item of result.items) { assert.ok(!seen.has(item.href), 'no title repeats'); seen.add(item.href); }
      trail.push([result.items.length, result.hasMore]); sourceId = result.sourceId; hasMore = result.hasMore; page += 1;
    }
    assert.deepEqual(trail, [[17, true], [11, true], [20, true], [4, false]], 'a short page is not the end; the disabled next control is');
    assert.equal(seen.size, 52);
    assert.deepEqual(calls.map(url => url.searchParams.get('page')), ['1', '2', '3', '4'], 'no request past the last page');
    assert.ok([...seen].every(href => /^https:\/\/www\.moviedb\.wiki\/home\/(movie|tv)\/\d+$/.test(href)));
  });

  test(`${stem}: a query with one page of results offers no continuation`, async () => {
    const definition = load(stem);
    const http = async request => {
      const body = `<html><body><main>${Array.from({ length: 13 }, (_, i) => `<article class=poster-card data-id=${i + 1} data-title="One ${i + 1}" data-type=movie data-poster="https://image.tmdb.org/t/p/w342/o${i}.jpg"></article>`).join('')}</main></body></html>`;
      return { ok: true, status: 200, headers: {}, body, bodyBytes: body.length, finalUrl: request.url };
    };
    const result = await createContentModuleApi(http).searchPage(definition, 'one page', 1);
    assert.deepEqual([result.items.length, result.hasMore], [13, false]);
  });
}
