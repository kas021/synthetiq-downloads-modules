// Run with the Downloads app's tsx: DOWNLOADS_APP_ROOT=/path/to/app npx tsx --test /path/to/this-file.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createCipheriv } from 'node:crypto';

if (!process.env.DOWNLOADS_APP_ROOT) throw Error('Set DOWNLOADS_APP_ROOT to the Downloads app checkout');
const { createContentModuleApi, parseContentModuleDefinition } = await import(pathToFileURL(path.join(process.env.DOWNLOADS_APP_ROOT, 'native/core/content-module.ts')).href);
const raw = readFileSync(new URL('../modules-data/animekai-downloads.smod.json', import.meta.url), 'utf8');
const definition = parseContentModuleDefinition(raw);
const href = 'https://animekai.be/watch/exact-title/ep-21?ep=21';

function fixture({ legacy = false, encrypted = false, wrongEmbed = false, badMetadata = false } = {}) {
  const calls = [];
  const api = createContentModuleApi(async request => {
    const url = new URL(request.url); calls.push(url);
    const json = data => ({ok:true,status:200,headers:{},body:JSON.stringify(data),finalUrl:request.url});
    if (url.hostname === 'animekai.be') return json({sources:{sub:[{source_url:'https://megaplay.buzz/stream/route/sub'}],dub:[{source_url:wrongEmbed ? 'https://private.invalid/stream/wrong/dub' : 'https://megaplay.buzz/stream/route/dub'}]}});
    if (url.pathname.startsWith('/stream/route/')) return {ok:true,status:200,headers:{},body:badMetadata ? '<html>No player identity</html>' : '<div class="fix-area" data-id="741"></div>',finalUrl:request.url};
    assert.equal(url.searchParams.get('id'),'741', 'route numbers never replace the embed identity');
    assert.equal(url.searchParams.get('type'),'dub');
    if (url.pathname === '/stream/getSourcesNew' && legacy) return {ok:false,status:404,headers:{},body:'',finalUrl:request.url};
    assert(['/stream/getSourcesNew','/stream/getSources'].includes(url.pathname));
    const sources = [{file:'https://megaplay.buzz/exact-dub.m3u8'}];
    const tracks = [{file:'https://megaplay.buzz/en.vtt',label:'English',kind:'captions'}];
    if (!encrypted) return json({sources,tracks});
    const spec = definition.capabilities.download.alternatives[0].steps.at(-1).response;
    const cipher=createCipheriv('aes-256-cbc',Buffer.from(spec.keyHex,'hex'),Buffer.from(spec.ivHex,'hex'));
    return json({enc:Buffer.concat([cipher.update(JSON.stringify(sources)),cipher.final()]).toString('base64url'),tracks});
  });
  return {api,calls};
}

test('current descriptor retains exact DUB, embed identity and captions', async () => {
  const f=fixture(); const result=await f.api.download(definition,href,'dub');
  assert.equal(result.candidates[0].url,'https://megaplay.buzz/exact-dub.m3u8');
  assert.equal(result.subtitles[0].url,'https://megaplay.buzz/en.vtt');
  assert(f.calls.some(url=>url.pathname==='/stream/getSourcesNew'));
  assert(!f.calls.some(url=>url.pathname==='/stream/getSources'), 'successful current routes do not make speculative legacy requests');
});

test('legacy descriptor still works after a current-endpoint failure', async () => {
  const f=fixture({legacy:true,encrypted:true}); const result=await f.api.download(definition,href,'dub');
  assert(result.candidates.some(c=>c.id.includes('legacy')));
  assert(f.calls.some(url=>url.pathname==='/stream/getSources'));
  assert(result.subtitles.length);
});

test('missing embed metadata and undeclared hosts cannot produce a media request', async () => {
  for (const options of [{wrongEmbed:true},{badMetadata:true}]) {
    const f=fixture(options); await assert.rejects(f.api.download(definition,href,'dub'));
    assert(!f.calls.some(url=>url.pathname.includes('getSources')));
    assert(f.calls.every(url=>['animekai.be','megaplay.buzz'].includes(url.hostname)));
  }
});
