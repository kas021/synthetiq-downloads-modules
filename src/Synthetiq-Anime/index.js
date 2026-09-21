/**
 * Synthetiq Anime for Synthetiq Player.
 * Live English Sub/Dub via Vidhawk (hard media probe). MegaPlay only if
 * a real video segment is proven. Fresh resolve on every play.
 */
(function () {
  'use strict';

  var MODULE = 'Synthetiq Anime';
  var SITE = 'https://anicrowd.xyz';
  var ANILIST = 'https://graphql.anilist.co';
  var JIKAN = 'https://api.jikan.moe/v4';
  var VIDHAWK = 'https://vidhawk.buzz';
  var MEGAPLAY = 'https://megaplay.buzz';
  var USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  var FAKE_HLS = /tiktokcdn|ibyteimg|ad-site-i18n|\/obj\/ad-site|\.png(?:\?|$)/i;
  var MEDIA_FIELDS =
    'id idMal title { romaji english native userPreferred } description(asHtml: false) ' +
    'bannerImage coverImage { extraLarge large medium } format status episodes duration ' +
    'season seasonYear averageScore genres isAdult nextAiringEpisode { episode }';

  function log(msg) {
    try {
      console.log('[' + MODULE + '] ' + String(msg || ''));
    } catch (_) {}
  }

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function headers(extra) {
    var out = {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
    };
    var src = extra || {};
    Object.keys(src).forEach(function (key) {
      out[key] = src[key];
    });
    return out;
  }

  async function readBody(response) {
    if (!response) return '';
    // Flutter omits raw JSON bodies and retains the parsed value in json().
    if (response.bodyDropped) throw new Error('Response exceeded runtime limit');
    if (response.json) {
      try {
        var parsed = typeof response.json === 'function' ? await response.json() : response.json;
        if (parsed != null) return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      } catch (_) {}
    }
    if (typeof response.body === 'string' && response.body) return response.body;
    if (typeof response.text === 'function') {
      try {
        var text = await response.text();
        if (typeof text === 'string' && text) return text;
      } catch (_) {}
    }
    return '';
  }

  async function request(url, extraHeaders, method, body, options) {
    var hdrs = headers(extraHeaders);
    var response = null;
    var opts = options || {};
    if (opts.session && (opts.session.closed || Date.now() >= opts.session.deadline)) {
      return { ok: false, status: 0, text: '', json: null };
    }
    try {
      if (typeof fetchv2 === 'function') {
        if (opts.followRedirects === false) {
          response = await fetchv2(url, hdrs, method || 'GET', body || null, {
            followRedirects: false,
          });
        } else {
          response = await fetchv2(url, hdrs, method || 'GET', body || null);
        }
      } else if (typeof fetch === 'function') {
        response = await fetch(url, {
          method: method || 'GET',
          headers: hdrs,
          body: body || undefined,
          redirect: opts.followRedirects === false ? 'manual' : 'follow',
        });
      }
    } catch (error) {
      return { ok: false, status: 0, text: '', json: null, error: String(error && error.message ? error.message : error) };
    }
    var status = Number(response && response.status) || 0;
    var text = await readBody(response);
    if (typeof fetchv2 !== 'function' && (!text || status === 0 || status >= 500) && typeof fetch === 'function') {
      try {
        var native = await fetch(url, {
          method: method || 'GET',
          headers: hdrs,
          body: body || undefined,
        });
        status = Number(native.status) || 0;
        text = await native.text();
        response = native;
      } catch (_) {}
    }
    var parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (_) {}
    return {
      ok: status >= 200 && status < 300,
      status: status,
      text: text || '',
      json: parsed,
      headers: (response && response.headers) || {},
    };
  }

  async function anilist(query, variables) {
    var res = await request(
      ANILIST,
      { Accept: 'application/json', 'Content-Type': 'application/json', Referer: SITE + '/' },
      'POST',
      JSON.stringify({ query: query, variables: variables || {} }),
    );
    if (!res.ok || !res.json || res.json.errors) {
      throw new Error('AniList request failed');
    }
    return res.json.data || {};
  }

  async function jikan(path) {
    var res = await request(JIKAN + path, {
      Accept: 'application/json',
      Referer: 'https://jikan.moe/',
    });
    if (!res.ok || !res.json) throw new Error('Jikan request failed');
    return res.json;
  }

  function jikanCard(row) {
    if (!row || !row.mal_id) return null;
    var title = clean(row.title_english || row.title || 'Anime');
    var image =
      (row.images &&
        ((row.images.jpg && (row.images.jpg.large_image_url || row.images.jpg.image_url)) ||
          (row.images.webp && row.images.webp.large_image_url))) ||
      '';
    var href = SITE + '/mal/' + row.mal_id;
    var year =
      row.year ||
      (row.aired && row.aired.prop && row.aired.prop.from && row.aired.prop.from.year) ||
      null;
    return {
      id: href,
      href: href,
      url: href,
      title: title,
      image: image,
      poster: image,
      backdrop: image,
      type: 'tv',
      kind: 'tv',
      format: row.type || '',
      year: year,
      rating: row.score ? Math.round(row.score * 10) / 10 : null,
      status: row.status || '',
      episodes: row.episodes || null,
      anilistId: null,
      malId: row.mal_id,
    };
  }

  function mediaCard(media) {
    if (!media || !media.id) return null;
    if (media.isAdult === true) return null;
    var title = clean(
      (media.title && (media.title.english || media.title.romaji || media.title.userPreferred)) || 'Anime',
    );
    var image =
      (media.coverImage && (media.coverImage.extraLarge || media.coverImage.large || media.coverImage.medium)) ||
      media.bannerImage ||
      '';
    var href = SITE + '/anime/' + media.id;
    return {
      id: href,
      href: href,
      url: href,
      title: title,
      image: image,
      poster: image,
      backdrop: media.bannerImage || image,
      type: 'tv',
      kind: media.format === 'MOVIE' ? 'movie' : 'tv',
      format: media.format || '',
      year: media.seasonYear || null,
      rating: media.averageScore ? Math.round(media.averageScore) / 10 : null,
      status: media.status || '',
      episodes: media.episodes || null,
      anilistId: media.id,
      malId: media.idMal || null,
    };
  }

  function parseRef(raw) {
    var text = String(raw || '').trim();
    try { text = decodeURIComponent(text); } catch (_) {}
    var queryEp = text.match(/[?&]ep=(\d+)/i);
    var malWatch = text.match(/\/mal\/(\d+)/i);
    var compactMal = text.match(/^anicrowd:mal:(\d+)(?::(\d+))?$/i);
    var watch = text.match(/\/anime\/(\d+)(?:\/watch)?/i);
    var compact = text.match(/^anicrowd:(\d+)(?::(\d+))?$/i);
    var ep = compactMal && compactMal[2]
      ? Number(compactMal[2])
      : compact && compact[2]
        ? Number(compact[2])
        : queryEp
          ? Number(queryEp[1])
          : 0;
    if (malWatch || compactMal) {
      return {
        anilistId: 0,
        malId: Number((malWatch && malWatch[1]) || (compactMal && compactMal[1]) || 0),
        episode: ep,
      };
    }
    return {
      anilistId: compact ? Number(compact[1]) : watch ? Number(watch[1]) : 0,
      malId: 0,
      episode: ep,
    };
  }

  function episodeHref(ref, ep) {
    if (ref.anilistId) return SITE + '/anime/' + ref.anilistId + '/watch?ep=' + ep;
    return SITE + '/mal/' + ref.malId + '/watch?ep=' + ep;
  }

  function vidhawkHeaders(referer) {
    return {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.apple.mpegurl,application/json,*/*',
      Referer: referer || VIDHAWK + '/',
      Origin: VIDHAWK,
    };
  }

  function megaplayHeaders() {
    return {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
      Referer: MEGAPLAY + '/',
      Origin: MEGAPLAY,
    };
  }

  function looksFake(value) {
    return FAKE_HLS.test(String(value || ''));
  }

  function resolveUrl(value, base) {
    var href = String(value || '').trim();
    if (!href) return '';
    if (/^https?:\/\//i.test(href)) return href;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return '';
    var parts = String(base || '').match(/^(https?:\/\/[^/?#]+)([^?#]*)/i);
    if (!parts) return '';
    if (href.indexOf('//') === 0) return parts[1].split(':')[0] + ':' + href;
    if (href.charAt(0) === '?') return parts[1] + (parts[2] || '/') + href;
    if (href.charAt(0) === '#') return String(base).split('#')[0] + href;
    // QuickJS does not provide the browser URL constructor. Keep signed suffixes intact.
    var suffixAt = href.search(/[?#]/);
    var suffix = suffixAt < 0 ? '' : href.slice(suffixAt);
    var path = suffixAt < 0 ? href : href.slice(0, suffixAt);
    if (path.charAt(0) !== '/') path = (parts[2] || '/').replace(/[^/]*$/, '') + path;
    var out = [];
    path.split('/').forEach(function (part) {
      if (part === '..') out.pop();
      else if (part !== '.') out.push(part);
    });
    return parts[1] + '/' + out.join('/').replace(/^\/+/, '') + suffix;
  }

  function firstPlaylistUrl(master, base) {
    var lines = String(master || '').split(/\r?\n/);
    var i;
    for (i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      if (line.indexOf('#EXT-X-STREAM-INF') === 0) {
        var j;
        for (j = i + 1; j < lines.length; j += 1) {
          var next = lines[j].trim();
          if (!next || next.charAt(0) === '#') continue;
          return resolveUrl(next, base);
        }
      }
    }
    for (i = 0; i < lines.length; i += 1) {
      var media = lines[i].trim();
      if (!media || media.charAt(0) === '#') continue;
      return resolveUrl(media, base);
    }
    return '';
  }

  function parseQualities(master, base, hdrs) {
    if (/#EXT-X-MEDIA:.*TYPE=AUDIO/i.test(master)) return [];
    var lines = String(master || '').split(/\r?\n/);
    var out = [];
    var seen = {};
    var i;
    for (i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      if (line.indexOf('#EXT-X-STREAM-INF') !== 0) continue;
      var height = 0;
      var res = line.match(/RESOLUTION=\d+x(\d+)/i);
      if (res) height = Number(res[1]) || 0;
      var next = '';
      var j;
      for (j = i + 1; j < lines.length; j += 1) {
        var cand = lines[j].trim();
        if (!cand || cand.charAt(0) === '#') continue;
        next = cand;
        break;
      }
      if (!next || looksFake(next)) continue;
      var url = resolveUrl(next, base);
      if (!url) continue;
      if (seen[url]) continue;
      seen[url] = true;
      out.push({
        label: height ? height + 'p' : 'Auto',
        height: height || undefined,
        url: url,
        headers: hdrs,
      });
    }
    out.sort(function (a, b) {
      return (b.height || 0) - (a.height || 0);
    });
    return out.slice(0, 8);
  }

  async function probeHls(url, hdrs, session) {
    if (!url || looksFake(url)) return { ok: false, reason: 'fake_url' };
    var playlist = await request(url, hdrs, 'GET', null, { session: session });
    if (!playlist.ok || playlist.text.indexOf('#EXTM3U') < 0) {
      return { ok: false, reason: 'not_hls', status: playlist.status };
    }
    if (looksFake(playlist.text)) return { ok: false, reason: 'fake_hls' };
    var child = firstPlaylistUrl(playlist.text, url);
    if (!child) return { ok: false, reason: 'no_media' };
    if (looksFake(child)) return { ok: false, reason: 'fake_hls' };
    var mediaUrl = url;
    var mediaBody = playlist.text;
    if (/#EXT-X-STREAM-INF:/i.test(playlist.text)) {
      var variant = await request(child, hdrs, 'GET', null, { session: session });
      if (!variant.ok || variant.text.indexOf('#EXTM3U') < 0) {
        return { ok: false, reason: 'variant_fail', status: variant.status };
      }
      if (looksFake(variant.text)) return { ok: false, reason: 'fake_hls' };
      mediaUrl = child;
      mediaBody = variant.text;
    }
    if (!/#EXTINF:/i.test(mediaBody)) return { ok: false, reason: 'no_segments' };
    var seg = firstPlaylistUrl(mediaBody, mediaUrl);
    if (!seg || looksFake(seg)) return { ok: false, reason: 'fake_seg' };
    var segment = await request(seg, Object.assign({}, hdrs, { Range: 'bytes=0-4095' }), 'GET', null, { session: session });
    if (!segment.ok) return { ok: false, reason: 'seg_' + segment.status, status: segment.status };
    var sample = segment.text || '';
    if (/^\s*<(?:!doctype|html)/i.test(sample)) return { ok: false, reason: 'seg_html' };
    if (/PNG|JFIF|GIF8|WEBP/i.test(sample.slice(0, 64))) {
      return { ok: false, reason: 'seg_image' };
    }
    var mime = String(segment.headers['content-type'] || '').toLowerCase();
    var ts = sample.charCodeAt(0) === 0x47 && /video\/(mp2t|mpeg)|octet-stream/.test(mime);
    var fragment = /^(styp|moof)$/.test(sample.slice(4, 8));
    if (!ts && !fragment) return { ok: false, reason: 'unrecognized_media' };
    if (fragment) {
      var map = mediaBody.match(/#EXT-X-MAP:.*URI="([^"]+)"/i);
      if (!map) return { ok: false, reason: 'missing_init' };
      var init = await request(resolveUrl(map[1], mediaUrl), Object.assign({}, hdrs, { Range: 'bytes=0-4095' }), 'GET', null, { session: session });
      if (!init.ok || !/^(ftyp|moov)$/.test(init.text.slice(4, 8))) return { ok: false, reason: 'invalid_init' };
    }
    return { ok: true, master: playlist.text };
  }

  function mapCaptions(captions, audio, hdrs) {
    var out = [];
    var seen = {};
    function push(item) {
      if (!item || typeof item !== 'object') return;
      var file = String(item.src || item.file || item.url || '').trim();
      if (!/^https?:\/\//i.test(file) || seen[file]) return;
      var lang = clean(item.lang || item.language || '').toLowerCase();
      var aliases = {
        english: 'en', japanese: 'ja', spanish: 'es', arabic: 'ar', french: 'fr',
        italian: 'it', german: 'de', portuguese: 'pt', russian: 'ru', chinese: 'zh',
        korean: 'ko', turkish: 'tr', polish: 'pl', indonesian: 'id', thai: 'th',
        vietnamese: 'vi', dutch: 'nl', ukrainian: 'uk', hindi: 'hi', czech: 'cs',
        danish: 'da', finnish: 'fi', greek: 'el', hebrew: 'he', malay: 'ms',
        norwegian: 'no', swedish: 'sv', romanian: 'ro', hungarian: 'hu',
        bulgarian: 'bg', croatian: 'hr', serbian: 'sr', slovak: 'sk',
        slovenian: 'sl', persian: 'fa', bengali: 'bn', tamil: 'ta', telugu: 'te',
        urdu: 'ur', filipino: 'fil', catalan: 'ca', estonian: 'et', latvian: 'lv',
        lithuanian: 'lt', icelandic: 'is', swahili: 'sw',
      };
      // Provider sometimes sends lang=en on every track; explicit labels identify translations.
      var labelLanguage = clean(item.label || '').toLowerCase().split(/[ (]/)[0];
      var languageName = lang.split(/[ (]/)[0];
      lang = aliases[labelLanguage] || aliases[languageName] || lang;
      if (!lang) lang = 'und';
      seen[file] = true;
      out.push({
        id: file,
        url: file,
        file: file,
        label: clean(item.label || item.language || item.lang || 'Subtitle'),
        language: lang,
        lang: lang,
        kind: 'subtitle',
        default: Boolean(item.default),
        headers: hdrs,
      });
    }
    if (Array.isArray(captions)) {
      captions.forEach(push);
      return out;
    }
    if (captions && typeof captions === 'object') {
      var key = audio === 'dub' ? 'dub' : 'sub';
      // Sub and Dub may be different edits. Never mix their caption timelines.
      if (Array.isArray(captions[key])) captions[key].forEach(push);
    }
    return out;
  }

  function markerPair(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var start = Number(raw.start);
    var end = Number(raw.end);
    if (!isFinite(start) || !isFinite(end) || start < 0 || end <= start) return null;
    return { start: Math.floor(start), end: Math.floor(end) };
  }

  function withTimeout(promise, ms, fallback) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve(fallback); }, ms);
      Promise.resolve(promise).then(function (value) {
        clearTimeout(timer);
        resolve(value);
      }, function () {
        clearTimeout(timer);
        resolve(fallback);
      });
    });
  }

  async function playVidhawkTicket(ticket, want, label, session, referer) {
    if (!ticket) return null;
    var play = await request(VIDHAWK + '/api/play?t=' + encodeURIComponent(ticket), vidhawkHeaders(referer), 'GET', null, { session: session });
    var meta = play.json;
    if (!play.ok || !meta) return null;
    var tracks = Array.isArray(meta.tracks) ? meta.tracks : [];
    var track = tracks.filter(function (row) {
      return row && row.id === want && row.src;
    })[0];
    if (!track || !track.src) return null;
    var hdrs = vidhawkHeaders(referer);
    var probe = await probeHls(track.src, hdrs, session);
    if (!probe.ok) {
      log('probe failed ' + (label || '') + ' ' + (probe.reason || ''));
      return null;
    }
    return {
      name: String(label || meta.serverLabel || meta.server || 'Server'),
      url: track.src,
      headers: hdrs,
      streamType: 'hls',
      lang: want,
      subtitles: mapCaptions(meta.captions, want, hdrs),
      qualities: parseQualities(probe.master, track.src, hdrs),
      intro: markerPair(meta.intro),
      outro: markerPair(meta.outro),
      dubAvailable: tracks.some(function (row) {
        return row && row.id === 'dub' && row.src;
      }),
    };
  }

  async function resolveVidhawk(anilistId, malId, episode, audio, serverName, session) {
    var want = audio === 'dub' ? 'dub' : 'sub';
    var embedPath = anilistId
      ? VIDHAWK + '/embed/ani/' + anilistId + '/' + episode + '/' + want
      : VIDHAWK + '/embed/mal/' + malId + '/' + episode + '/' + want;
    var server = serverName || 'flow';
    var params =
      'episode=' +
      encodeURIComponent(episode) +
      '&audio=' +
      encodeURIComponent(want) +
      '&parentHost=anicrowd.xyz&fast=1&server=' +
      encodeURIComponent(server);
    if (anilistId) params += '&anilistId=' + encodeURIComponent(anilistId);
    if (malId) params += '&malId=' + encodeURIComponent(malId);
    if (!anilistId && !malId) return null;
    var resolved = await request(
      VIDHAWK + '/api/stream/resolve?' + params,
      Object.assign(vidhawkHeaders(), { Referer: embedPath }),
      'GET', null, { session: session },
    );
    var ticket = resolved.json && resolved.json.ticket;
    if (!resolved.ok || !ticket) return null;
    return playVidhawkTicket(ticket, want, resolved.json.serverLabel || server, session, embedPath);
  }

  async function resolveVidhawkPair(anilistId, malId, episode, audio) {
    var session = { closed: false, deadline: Date.now() + 9000 };
    var results = [];
    var firstReady;
    var first = new Promise(function (resolve) { firstReady = resolve; });
    var all = Promise.all(['flow', 'zuri'].map(function (name) {
      return resolveVidhawk(anilistId, malId, episode, audio, name, session).then(function (row) {
        if (!session.closed && row && row.url) {
          results.push(row);
          firstReady();
        }
      }).catch(function () {});
    }));
    await withTimeout(Promise.race([first, all]), 9000, null);
    if (results.length) await withTimeout(all, Math.min(800, Math.max(0, session.deadline - Date.now())), null);
    // An in-flight HTTP request cannot be cancelled by fetchv2. Stop its next step.
    session.closed = true;
    return results.slice();
  }

  async function resolveMegaPlay(embedUrl, wantLang) {
    if (!embedUrl || embedUrl.indexOf('megaplay') < 0) return null;
    var page = await request(embedUrl, {
      Referer: SITE + '/',
      Accept: 'text/html,*/*',
    });
    if (!page.ok) return null;
    var idMatch = page.text.match(/data-id=["'](\d+)["']/i);
    if (!idMatch) return null;
    var type = /\/dub(?:$|[/?#])/i.test(embedUrl) ? 'dub' : 'sub';
    if (type !== wantLang) return null;
    var sourceUrl =
      MEGAPLAY +
      '/stream/getSourcesNew?id=' +
      encodeURIComponent(idMatch[1]) +
      '&id=' +
      encodeURIComponent(idMatch[1]) +
      '&type=' +
      encodeURIComponent(type);
    var src = await request(sourceUrl, megaplayHeaders());
    var data = src.json;
    if (!src.ok || !data) return null;
    var file =
      (data.sources && (data.sources.file || data.sources.url)) ||
      (typeof data.sources === 'string' ? data.sources : '');
    if (!file) return null;
    var hdrs = megaplayHeaders();
    var probe = await probeHls(file, hdrs);
    if (!probe.ok) {
      log('megaplay rejected ' + (probe.reason || 'probe'));
      return null;
    }
    var subs = [];
    (data.tracks || []).forEach(function (track) {
      if (!track || !track.file) return;
      var kind = String(track.kind || 'captions').toLowerCase();
      if (kind !== 'captions' && kind !== 'subtitles') return;
      subs.push({
        id: track.file,
        url: track.file,
        file: track.file,
        label: clean(track.label || 'Subtitle'),
        language: clean(track.label || 'und').toLowerCase(),
        lang: clean(track.label || 'und').toLowerCase(),
        kind: 'subtitle',
        default: Boolean(track.default),
        headers: hdrs,
      });
    });
    return {
      name: 'MegaPlay',
      url: file,
      headers: hdrs,
      streamType: 'hls',
      lang: wantLang,
      subtitles: subs,
      qualities: parseQualities(probe.master, file, hdrs),
      intro: markerPair(data.intro),
      outro: markerPair(data.outro),
    };
  }

  async function anicrowdEmbed(anilistId, malId, title, episode, server, subDub) {
    var params = {
      server: server,
      anilistId: String(anilistId),
      ep: String(episode),
      subdub: subDub || 'sub',
    };
    if (malId) params.idMal = String(malId);
    if (title) {
      params.romaji = title;
      params.english = title;
      params.titleParam = title;
    }
    var query = Object.keys(params)
      .map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      })
      .join('&');
    var res = await request(SITE + '/api/stream?' + query, {
      Accept: 'application/json',
      Referer: SITE + '/',
    });
    return res.json;
  }

  function packStream(primary, extras, lang) {
    if (!primary || !primary.url) {
      return {
        streams: [],
        subtitles: [],
        lang: lang,
        error: { message: 'Synthetiq Anime has no playable stream for this episode yet.' },
      };
    }
    var servers = [];
    var seen = {};
    [primary].concat(extras || []).forEach(function (row) {
      if (!row || !row.url || seen[row.url]) return;
      seen[row.url] = true;
      var entry = {
        name: row.name || 'Server',
        label: row.name || 'Server',
        url: row.url,
        headers: row.headers || {},
        streamType: row.streamType || 'hls',
        lang: row.lang || lang,
        subtitles: row.subtitles || [],
        qualities: row.qualities || [],
      };
      if (row.intro) {
        entry.intro = [row.intro.start, row.intro.end];
      }
      if (row.outro) {
        entry.outro = [row.outro.start, row.outro.end];
      }
      servers.push(entry);
    });
    var qualities = Array.isArray(primary.qualities) ? primary.qualities : [];
    var streams = [(lang === 'dub' ? 'dub Auto' : 'sub Auto'), primary.url];
    qualities.forEach(function (q) {
      if (q && q.url && q.label) streams.push(q.label, q.url);
    });
    var payload = {
      url: primary.url,
      streams: streams,
      headers: primary.headers || {},
      streamType: 'hls',
      lang: lang,
      quality: 'Auto',
      defaultQuality: 'Auto',
      qualities: [{ label: 'Auto', url: primary.url, headers: primary.headers || {} }].concat(qualities),
      subtitles: primary.subtitles || [],
      servers: servers,
    };
    if (primary.intro) {
      payload.intro = primary.intro;
      payload.introStartSeconds = primary.intro.start;
      payload.introEndSeconds = primary.intro.end;
    }
    if (primary.outro) {
      payload.outro = primary.outro;
      payload.outroStartSeconds = primary.outro.start;
      payload.outroEndSeconds = primary.outro.end;
    }
    return payload;
  }

  async function searchResults(query) {
    var q = clean(query);
    try {
      if (!q) {
        var trending = await anilist(
          'query ($page:Int){ Page(page:$page, perPage:20){ media(type:ANIME, sort:TRENDING_DESC){ ' +
            MEDIA_FIELDS +
            ' } } }',
          { page: 1 },
        );
        return ((trending.Page && trending.Page.media) || []).map(mediaCard).filter(Boolean);
      }
      var data = await anilist(
        'query ($q:String){ Page(page:1, perPage:20){ media(search:$q, type:ANIME, sort:SEARCH_MATCH){ ' +
          MEDIA_FIELDS +
          ' } } }',
        { q: q },
      );
      return ((data.Page && data.Page.media) || []).map(mediaCard).filter(Boolean);
    } catch (error) {
      log('anilist search fallback jikan: ' + (error && error.message ? error.message : error));
      try {
        var path = q
          ? '/anime?q=' + encodeURIComponent(q) + '&limit=20&sfw=true'
          : '/top/anime?limit=20';
        var jk = await jikan(path);
        return (jk.data || []).map(jikanCard).filter(Boolean);
      } catch (err) {
        log('catalogue temporarily unavailable');
        return [];
      }
    }
  }

  async function extractDetails(urlOrId) {
    var ref = parseRef(urlOrId);
    if (!ref.anilistId && !ref.malId) {
      var found = await searchResults(urlOrId);
      var best = found[0];
      if (best && best.anilistId) {
        try {
          return await extractDetails('anicrowd:' + best.anilistId);
        } catch (_) {}
      }
      if (best && best.malId) {
        try {
          return await extractDetails('anicrowd:mal:' + best.malId);
        } catch (_) {}
      }
      return best
        ? {
            id: best.href,
            href: best.href,
            title: best.title,
            image: best.image,
            description: '',
            malId: best.malId,
            anilistId: best.anilistId,
          }
        : { title: 'Unavailable', description: '' };
    }
    if (ref.anilistId) {
      try {
        var data = await anilist(
          'query ($id:Int){ Media(id:$id, type:ANIME){ ' +
            MEDIA_FIELDS +
            ' characters(sort:[ROLE,RELEVANCE], perPage:12){ nodes { name { full } } } } }',
          { id: ref.anilistId },
        );
        var media = data.Media;
        var card = mediaCard(media) || {};
        return {
          id: card.href,
          href: card.href,
          title: card.title,
          name: card.title,
          image: card.image,
          poster: card.image,
          banner: (media && media.bannerImage) || '',
          backdrop: (media && media.bannerImage) || card.image || '',
          description: clean(media && media.description),
          synopsis: clean(media && media.description),
          genres: (media && media.genres) || [],
          year: media && media.seasonYear,
          seasonYear: media && media.seasonYear,
          rating: media && media.averageScore ? Math.round(media.averageScore) / 10 : null,
          format: (media && media.format) || '',
          status: media && media.status,
          episodes: media && media.episodes,
          duration: media && media.duration,
          isMovie: Boolean(media && media.format === 'MOVIE'),
          cast: ((media && media.characters && media.characters.nodes) || [])
            .map(function (node) { return node && node.name && node.name.full; })
            .filter(Boolean),
          anilistId: ref.anilistId,
          malId: media && media.idMal,
        };
      } catch (_) {}
    }
    if (ref.malId) {
      try {
        var jk = await jikan('/anime/' + ref.malId);
        var row = jk.data || {};
        var cardJ = jikanCard(row) || {};
        return {
          id: cardJ.href,
          href: cardJ.href,
          title: cardJ.title,
          name: cardJ.title,
          image: cardJ.image,
          poster: cardJ.image,
          backdrop: cardJ.image,
          description: clean(row.synopsis),
          synopsis: clean(row.synopsis),
          genres: (row.genres || []).map(function (g) { return g && g.name; }).filter(Boolean),
          year: row.year,
          rating: row.score || null,
          format: row.type || '',
          status: row.status,
          episodes: row.episodes,
          isMovie: Boolean(row.type === 'Movie'),
          anilistId: 0,
          malId: row.mal_id,
        };
      } catch (_) {}
    }
    return { title: 'Unavailable', description: '', href: urlOrId };
  }

  async function extractEpisodes(seriesId) {
    var ref = parseRef(seriesId);
    if (!ref.anilistId && !ref.malId) return [];
    var total = 0;
    var airedLimitKnown = false;
    if (ref.anilistId) {
      try {
        var data = await anilist(
          'query ($id:Int){ Media(id:$id, type:ANIME){ id idMal episodes nextAiringEpisode { episode } } }',
          { id: ref.anilistId },
        );
        var media = data.Media || {};
        total = Number(media.episodes) || 0;
        var next = media.nextAiringEpisode && Number(media.nextAiringEpisode.episode);
        if (next && next > 0) {
          airedLimitKnown = true;
          total = total ? Math.min(total, next - 1) : next - 1;
        }
        if (media.idMal && !ref.malId) ref.malId = media.idMal;
      } catch (_) {}
    }
    if (!total && ref.malId && !airedLimitKnown) {
      try {
        var jk = await jikan('/anime/' + ref.malId);
        total = Number(jk.data && jk.data.episodes) || 0;
      } catch (_) {}
    }
    if (!total) return [];
    var out = [];
    var i;
    for (i = 1; i <= total && i <= 2000; i += 1) {
      out.push({
        id: episodeHref(ref, i),
        href: episodeHref(ref, i),
        number: i,
        episodeNumber: i,
        title: 'Episode ' + i,
        subAvailable: true,
      });
    }
    return out;
  }

  async function extractStreamUrl(episodeHref, lang) {
    var want = String(lang || 'sub').toLowerCase() === 'dub' ? 'dub' : 'sub';
    var ref = parseRef(episodeHref);
    if ((!ref.anilistId && !ref.malId) || !ref.episode) {
      return { streams: [], subtitles: [], error: { message: 'Invalid Synthetiq Anime episode.' } };
    }
    var extras = [];
    var primary = null;
    try {
      var servers = await resolveVidhawkPair(ref.anilistId || 0, ref.malId || 0, ref.episode, want);
      primary = servers[0] || null;
      extras = servers.slice(1);
    } catch (error) {
      log('vidhawk failed ' + (error && error.message ? error.message : error));
    }
    if (!primary && ref.anilistId) {
      try {
        var crowd = await withTimeout(
          anicrowdEmbed(
            ref.anilistId,
            ref.malId || 0,
            '',
            ref.episode,
            'english',
            want,
          ),
          6000,
          null,
        );
        if (crowd && crowd.ok && crowd.url) {
          var mega = await withTimeout(resolveMegaPlay(crowd.url, want), 5000, null);
          if (mega) {
            primary = mega;
          }
        }
      } catch (error) {
        log('megaplay skip ' + (error && error.message ? error.message : error));
      }
    }
    return packStream(primary, extras, want);
  }

  var SEASON_NAMES = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

  function currentSeason() {
    var now = new Date();
    return {
      season: SEASON_NAMES[Math.floor(now.getMonth() / 3)] || 'SUMMER',
      year: now.getFullYear(),
    };
  }

  function seasonLabel(season) {
    return season.charAt(0) + season.slice(1).toLowerCase();
  }

  function homeAlias(alias, filters, sort) {
    return (
      alias +
      ': Page(page:1, perPage:18){ media(type:ANIME' +
      (filters ? ', ' + filters : '') +
      ', sort:' + sort +
      '){ ' +
      MEDIA_FIELDS +
      ' } } '
    );
  }

  function aliasItems(data, key) {
    return ((data && data[key] && data[key].media) || []).map(mediaCard).filter(Boolean);
  }

  async function discoveryHome() {
    var season = currentSeason();
    try {
      var batchOne = await anilist(
        'query { ' +
          homeAlias('trending', '', 'TRENDING_DESC') +
          homeAlias('popular', '', 'POPULARITY_DESC') +
          homeAlias('topRated', '', 'SCORE_DESC') +
          homeAlias('airing', 'status:RELEASING', 'TRENDING_DESC') +
          '}',
      );
      var batchTwo = null;
      try {
        batchTwo = await anilist(
          'query { ' +
            homeAlias(
              'season',
              'season:' + season.season + ', seasonYear:' + season.year + ', status:RELEASING',
              'POPULARITY_DESC',
            ) +
            homeAlias('movie', 'format:MOVIE', 'POPULARITY_DESC') +
            homeAlias('action', 'genre_in:["Action"]', 'TRENDING_DESC') +
            homeAlias('comedy', 'genre_in:["Comedy"]', 'TRENDING_DESC') +
            '}',
        );
      } catch (_) {}
      var trending = aliasItems(batchOne, 'trending');
      var sections = [];
      if (trending.length) {
        sections.push({
          id: 'sa-hero',
          title: 'Trending',
          style: 'hero',
          items: trending.slice(0, 6),
          viewAll: { mode: 'feed', feedId: 'trending' },
        });
      }
      var push = function (id, title, items, feedId) {
        if (!items.length) return;
        sections.push({
          id: id,
          title: title,
          style: 'poster',
          items: items.slice(0, 20),
          viewAll: { mode: 'feed', feedId: feedId },
        });
      };
      push('sa-trending', 'Trending Now', trending, 'trending');
      push(
        'sa-season',
        'Popular This Season · ' + seasonLabel(season.season) + ' ' + season.year,
        aliasItems(batchTwo, 'season'),
        'season',
      );
      push('sa-popular', 'All-Time Popular', aliasItems(batchOne, 'popular'), 'popular');
      push('sa-top', 'Top Rated', aliasItems(batchOne, 'topRated'), 'top-rated');
      push('sa-airing', 'Airing Now', aliasItems(batchOne, 'airing'), 'airing');
      push('sa-movie', 'Anime Movies', aliasItems(batchTwo, 'movie'), 'movie');
      push('sa-action', 'Action & Adventure', aliasItems(batchTwo, 'action'), 'genre:Action');
      push('sa-comedy', 'Comedy', aliasItems(batchTwo, 'comedy'), 'genre:Comedy');
      if (!sections.length) throw new Error('empty home');
      return { sections: sections };
    } catch (error) {
      try {
        var jk = await jikan('/top/anime?limit=16');
        var items = (jk.data || []).map(jikanCard).filter(Boolean);
        return {
          sections: [
            {
              id: 'sa-popular',
              title: 'Top Anime',
              style: 'poster',
              items: items,
              viewAll: { mode: 'feed', feedId: 'jikan-top' },
            },
          ],
        };
      } catch (_) {
        return { sections: [] };
      }
    }
  }

  async function discoveryFeed(feedId, page) {
    var pageNumber = Math.max(1, Number(page) || 1);
    var id = String(feedId || 'trending').toLowerCase();
    if (id === 'jikan-top' || id === 'jikan-popular') {
      var jk = await jikan('/top/anime?limit=20&page=' + pageNumber);
      return {
        feedId: feedId,
        page: pageNumber,
        items: (jk.data || []).map(jikanCard).filter(Boolean),
        hasMore: Boolean(jk.pagination && jk.pagination.has_next_page),
      };
    }
    var season = currentSeason();
    var filters = '';
    var sort = 'TRENDING_DESC';
    if (id === 'popular') {
      sort = 'POPULARITY_DESC';
    } else if (id === 'top-rated' || id === 'top') {
      sort = 'SCORE_DESC';
    } else if (id === 'airing') {
      filters = 'status:RELEASING';
    } else if (id === 'movie' || id === 'movies') {
      filters = 'format:MOVIE';
      sort = 'POPULARITY_DESC';
    } else if (id === 'season') {
      filters = 'season:' + season.season + ', seasonYear:' + season.year + ', status:RELEASING';
      sort = 'POPULARITY_DESC';
    } else if (id.indexOf('genre:') === 0) {
      var genreName = clean(String(feedId).slice(6)).replace(/[^A-Za-z0-9 &-]/g, '');
      filters = 'genre_in:["' + (genreName || 'Action') + '"]';
    }
    try {
      var data = await anilist(
        'query ($page:Int){ Page(page:$page, perPage:20){ pageInfo { hasNextPage } media(type:ANIME' +
          (filters ? ', ' + filters : '') +
          ', sort:[' + sort + ']){ ' +
          MEDIA_FIELDS +
          ' } } }',
        { page: pageNumber },
      );
      var items = ((data.Page && data.Page.media) || []).map(mediaCard).filter(Boolean);
      return {
        feedId: feedId || 'trending',
        page: pageNumber,
        items: items,
        hasMore: Boolean(data.Page && data.Page.pageInfo && data.Page.pageInfo.hasNextPage),
      };
    } catch (error) {
      throw new Error('Catalogue page temporarily unavailable. Retry this page.');
    }
  }

  globalThis.searchResults = searchResults;
  globalThis.extractDetails = extractDetails;
  globalThis.extractEpisodes = extractEpisodes;
  globalThis.extractStreamUrl = extractStreamUrl;
  globalThis.discoveryHome = discoveryHome;
  globalThis.discoveryFeed = discoveryFeed;
})();
