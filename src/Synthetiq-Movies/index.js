(() => { const unity = {};
(function () {
  'use strict';

  var MODULE_NAME = 'StreamingUnity';
  var BASE_URL = 'https://streamingunity.vip';
  var VIX_BASE = 'https://vixcloud.co';
  var DEFAULT_CDN = 'https://cdn.streamingunity.vip';
  var USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  var PAGE_ACCEPT =
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  var HLS_ACCEPT =
    'application/vnd.apple.mpegurl,application/x-mpegURL,application/octet-stream,text/plain,*/*;q=0.8';

  var titlePageCache = Object.create(null);
  var titleSlugs = Object.create(null);

  function boundedRequest(promise, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('Request timed out')); }, timeoutMs);
      Promise.resolve(promise).then(function (value) {
        if (typeof clearTimeout === 'function') clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (typeof clearTimeout === 'function') clearTimeout(timer);
        reject(error);
      });
    });
  }

  function log(message) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[' + MODULE_NAME + '] ' + String(message));
    }
  }

  function decodeEntities(value) {
    if (value === null || value === undefined) return '';
    var text = String(value);
    for (var i = 0; i < 3; i += 1) {
      var decoded = text
        .replace(/&quot;/gi, '"')
        .replace(/&#039;|&#x27;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&nbsp;/gi, ' ');
      if (decoded === text) break;
      text = decoded;
    }
    return text;
  }

  function cleanText(value) {
    return decodeEntities(value).replace(/\s+/g, ' ').trim();
  }

  function decodeUrlPart(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch (_) {
      return String(value || '');
    }
  }

  function numberOr(value, fallback) {
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : fallback;
  }

  function positiveInt(value, fallback) {
    var parsed = parseInt(value, 10);
    return isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function truthyFlag(value, defaultValue) {
    if (value === null || value === undefined || value === '') {
      return defaultValue === undefined ? false : defaultValue;
    }
    if (value === true || value === 1) return true;
    var text = String(value).toLowerCase().trim();
    if (text === '1' || text === 'true' || text === 'yes' || text === 'on') {
      return true;
    }
    if (text === '0' || text === 'false' || text === 'no' || text === 'off') {
      return false;
    }
    return Boolean(value);
  }

  function isHttp(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  }

  function absoluteUrl(value, base) {
    var text = cleanText(value).replace(/\\\//g, '/');
    if (!text) return '';
    if (/^\/\//.test(text)) return 'https:' + text;
    if (isHttp(text)) return text;
    if (text.charAt(0) === '/') return String(base || BASE_URL).replace(/\/$/, '') + text;
    return String(base || BASE_URL).replace(/\/$/, '') + '/' + text;
  }

  // Resolve HLS references against the actual playlist, not the embed host.
  function mediaUrl(value, base) {
    var ref = cleanText(value).replace(/\\\//g, '/');
    if (!ref) return '';
    if (isHttp(ref)) return ref;
    if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return '';
    if (ref.indexOf('//') === 0) return 'https:' + ref;
    var match = String(base || '').match(/^(https?:\/\/[^/]+)(\/[^?#]*)?/i);
    if (!match) return '';
    if (ref.charAt(0) === '?') return match[1] + (match[2] || '/') + ref;
    var suffixAt = ref.search(/[?#]/);
    var suffix = suffixAt < 0 ? '' : ref.substring(suffixAt);
    var refPath = suffixAt < 0 ? ref : ref.substring(0, suffixAt);
    var parts = (refPath.charAt(0) === '/' ? refPath : (match[2] || '/').replace(/[^/]*$/, '') + refPath).split('/');
    var normalized = [];
    parts.forEach(function (part) {
      if (part === '..') normalized.pop();
      else if (part !== '.') normalized.push(part);
    });
    return match[1] + normalized.join('/') + suffix;
  }

  async function requestText(url, extraHeaders, deadline) {
    var timeoutMs = Math.min(4000, deadline ? deadline - Date.now() : 4000);
    if (timeoutMs <= 0) return { status: 0, ok: false, text: '', headers: {}, error: 'Resolution budget exhausted' };
    var headers = {
      'User-Agent': USER_AGENT,
      Accept: PAGE_ACCEPT,
      Referer: BASE_URL + '/'
    };
    var extras = extraHeaders || {};
    Object.keys(extras).forEach(function (key) {
      headers[key] = extras[key];
    });

    var response = null;
    try {
      if (typeof globalThis.fetchv2 === 'function') {
        response = await boundedRequest(globalThis.fetchv2(url, headers, 'GET', null), timeoutMs);
      } else if (typeof fetch === 'function') {
        response = await boundedRequest(fetch(url, { method: 'GET', headers: headers }), timeoutMs);
      }
    } catch (error) {
      return {
        status: 0,
        ok: false,
        text: '',
        headers: {},
        error: error && error.message ? error.message : 'request failed'
      };
    }

    var status = Number(response && response.status) || 0;
    var body = '';
    if (response && typeof response.body === 'string') {
      body = response.body;
    }
    if (!body && response && typeof response.text === 'function') {
      try {
        var textValue = await boundedRequest(response.text(), timeoutMs);
        if (typeof textValue === 'string') body = textValue;
      } catch (_) {}
    }
    if (!body && response && response.json && typeof response.json === 'object') {
      try {
        body = JSON.stringify(response.json);
      } catch (_) {}
    }
    if (!body && response && typeof response.json === 'function') {
      try {
        var jsonValue = await response.json();
        if (jsonValue !== null && jsonValue !== undefined) {
          body = JSON.stringify(jsonValue);
        }
      } catch (_) {}
    }

    var outputHeaders = {};
    if (response && response.headers) {
      if (typeof response.headers.forEach === 'function') {
        response.headers.forEach(function (value, key) {
          outputHeaders[String(key).toLowerCase()] = String(value);
        });
      } else {
        Object.keys(response.headers).forEach(function (key) {
          outputHeaders[String(key).toLowerCase()] = String(response.headers[key]);
        });
      }
    }

    return {
      status: status,
      ok: status >= 200 && status < 400,
      text: body || '',
      headers: outputHeaders,
      error: ''
    };
  }

  function parsePageData(html) {
    var source = String(html || '');
    var trimmed = source.trim();
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try {
        return JSON.parse(decodeEntities(trimmed));
      } catch (_) {}
    }
    var match = source.match(/\bdata-page\s*=\s*"([^"]*)"/i) ||
      source.match(/\bdata-page\s*=\s*'([^']*)'/i);
    if (match && match[1]) {
      try {
        return JSON.parse(decodeEntities(match[1]));
      } catch (_) {}
    }

    var next = source.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (next && next[1]) {
      try {
        return JSON.parse(decodeEntities(next[1].trim()));
      } catch (_) {}
    }

    var initial = source.match(/(?:window\.__INITIAL_STATE__|__INITIAL_STATE__)\s*=\s*([\s\S]*?);\s*(?:window\.|<\/script|$)/i);
    if (initial && initial[1]) {
      try {
        return JSON.parse(decodeEntities(initial[1].trim()));
      } catch (_) {}
    }
    return null;
  }

  async function requestPage(url) {
    var result = await requestText(url, { Accept: PAGE_ACCEPT });
    if (!result.ok || !result.text) {
      throw new Error('StreamingUnity page unavailable (' + result.status + ')');
    }
    var page = parsePageData(result.text);
    if (!page || typeof page !== 'object') {
      throw new Error('StreamingUnity page data missing');
    }
    return page;
  }

  function propsOf(page) {
    if (!page || typeof page !== 'object') return {};
    return page.props && typeof page.props === 'object' ? page.props : page;
  }

  function cdnFromProps(props) {
    var candidate = props && props.cdn_url;
    return isHttp(candidate) ? String(candidate).replace(/\/$/, '') : DEFAULT_CDN;
  }

  function imageUrl(value, cdn) {
    if (!value) return '';
    if (typeof value === 'object') {
      var original = value.original_url_field || value.url || value.src;
      if (isHttp(original)) return String(original);
      value = value.filename || value.file || value.path || '';
    }
    var text = cleanText(value);
    if (!text || text === 'null' || text === 'undefined') return '';
    if (isHttp(text)) return text;
    if (text.indexOf('//') === 0) return 'https:' + text;
    if (text.charAt(0) === '/') {
      if (text.indexOf('/images/') === 0) return String(cdn || DEFAULT_CDN) + text;
      return BASE_URL + text;
    }
    return String(cdn || DEFAULT_CDN).replace(/\/$/, '') + '/images/' + text;
  }

  function imageRecords(record) {
    if (!record || !Array.isArray(record.images)) return [];
    return record.images;
  }

  function pickImage(record, wantedTypes, cdn) {
    var records = imageRecords(record);
    var priorities = wantedTypes || [];
    for (var i = 0; i < priorities.length; i += 1) {
      for (var j = 0; j < records.length; j += 1) {
        if (String(records[j] && records[j].type || '').toLowerCase() === String(priorities[i]).toLowerCase()) {
          var preferred = imageUrl(records[j], cdn);
          if (preferred) return preferred;
        }
      }
    }
    for (var k = 0; k < records.length; k += 1) {
      var fallback = imageUrl(records[k], cdn);
      if (fallback) return fallback;
    }
    return imageUrl(record.image || record.poster || record.cover, cdn);
  }

  function slugFor(record, fallback) {
    var source = cleanText(record && (record.slug || record.name || record.title)) || fallback || 'title';
    source = source.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    source = source.replace(/^-+|-+$/g, '');
    return source || 'title';
  }

  function canonicalTitleHref(id, slug) {
    return BASE_URL + '/en/titles/' + String(id) + '-' + slugFor({ slug: slug }, 'title');
  }

  function languageCode(value) {
    var raw = cleanText(value).toLowerCase();
    raw = raw.replace(/^forced-/, '');
    if (!raw) return 'und';
    if (raw.indexOf('eng') === 0 || raw === 'en') return 'en';
    if (raw.indexOf('ita') === 0 || raw === 'it') return 'it';
    if (raw.indexOf('ger') === 0 || raw.indexOf('deu') === 0 || raw === 'de') return 'de';
    if (raw.indexOf('fre') === 0 || raw.indexOf('fra') === 0 || raw === 'fr') return 'fr';
    if (raw.indexOf('spa') === 0 || raw === 'es') return 'es';
    if (raw.indexOf('por') === 0 || raw === 'pt') return 'pt';
    if (raw.indexOf('jpn') === 0 || raw === 'ja') return 'ja';
    if (raw.indexOf('kor') === 0 || raw === 'ko') return 'ko';
    if (raw.indexOf('ukr') === 0 || raw === 'uk') return 'uk';
    if (raw.indexOf('ara') === 0 || raw === 'ar') return 'ar';
    if (raw === 'gre' || raw === 'ell' || raw === 'el') return 'el';
    if (raw === 'rum' || raw === 'ron' || raw === 'ro') return 'ro';
    return raw.split('-')[0] || 'und';
  }

  function genresOf(record) {
    if (!record || !Array.isArray(record.genres)) return [];
    return record.genres.map(function (genre) {
      return cleanText(genre && typeof genre === 'object' ? (genre.name || genre.title) : genre);
    }).filter(Boolean);
  }

  function mapTitleRecord(record, props, flags) {
    var data = record || {};
    var id = cleanText(data.id);
    if (!id) return null;
    var title = cleanText(data.name || data.title || data.original_name) || ('Title ' + id);
    var slug = slugFor(data, title);
    titleSlugs[id] = slug;
    var cdn = cdnFromProps(props || {});
    var poster = pickImage(data, ['poster', 'cover_mobile', 'cover', 'background', 'logo'], cdn);
    var cover = pickImage(data, ['cover', 'cover_mobile', 'background', 'poster'], cdn) || poster;
    var background = pickImage(data, ['background', 'cover', 'cover_mobile', 'poster'], cdn) || cover || poster;
    var type = cleanText(data.type || 'movie').toLowerCase() || 'movie';
    var hasDub = truthyFlag(data.dub_ita, false);
    var hasSub = data.audio_orig === undefined && data.sub_ita === undefined
      ? true
      : truthyFlag(data.audio_orig, false) || truthyFlag(data.sub_ita, false);
    var yearText = cleanText(data.release_date || data.release_date_it || data.year);
    var yearMatch = yearText.match(/(19|20)\d{2}/);
    var item = {
      id: id,
      href: canonicalTitleHref(id, slug),
      url: canonicalTitleHref(id, slug),
      title: title,
      name: title,
      image: poster,
      poster: poster,
      posterUrl: poster,
      cover: cover,
      coverUrl: cover,
      backdrop: background,
      backdropUrl: background,
      background: background,
      description: cleanText(data.plot || data.description || data.overview),
      synopsis: cleanText(data.plot || data.description || data.overview),
      overview: cleanText(data.plot || data.description || data.overview),
      genres: genresOf(data),
      tags: genresOf(data),
      type: type,
      contentType: 'video',
      isMovie: type === 'movie',
      isTrending: Boolean(flags && flags.isTrending),
      isPopular: Boolean(flags && flags.isPopular),
      quality: cleanText(data.quality),
      rating: numberOr(data.score, 0),
      year: yearMatch ? parseInt(yearMatch[0], 10) : 0,
      releaseDate: yearText,
      runtime: numberOr(data.runtime, 0),
      seasonsCount: positiveInt(data.seasons_count, 0),
      subAvailable: hasSub,
      dubAvailable: hasDub
    };
    if (Array.isArray(data.seasons)) {
      item.seasons = data.seasons.map(function (season, index) {
        var seasonNumber = positiveInt(season && (season.number || season.season_number), index + 1);
        return {
          id: cleanText(season && season.id),
          number: seasonNumber,
          name: cleanText(season && season.name) || ('Season ' + seasonNumber),
          href: item.href + '/season-' + seasonNumber
        };
      });
    } else {
      item.seasons = [];
    }
    return item;
  }

  function titleRecords(props) {
    if (!props || typeof props !== 'object') return [];
    if (Array.isArray(props.titles)) return props.titles;
    if (Array.isArray(props.results)) return props.results;
    if (props.title && typeof props.title === 'object') return [props.title];
    return [];
  }

  function mapRecords(records, props, flags) {
    var result = [];
    (records || []).forEach(function (record) {
      var item = mapTitleRecord(record, props, flags);
      if (item) result.push(item);
    });
    return result;
  }

  function parseTitleRef(input) {
    var raw = decodeUrlPart(cleanText(input));
    var withoutQuery = raw.split(/[?#]/)[0];
    var customTitle = withoutQuery.match(/streamingunity-title:(\d+)(?::([^/]+))?/i);
    if (customTitle) {
      return { id: customTitle[1], slug: customTitle[2] || '' };
    }
    var customMovie = withoutQuery.match(/streamingunity-movie:(\d+)(?::(\d+))?/i);
    if (customMovie) {
      return { id: customMovie[1], slug: '' };
    }
    var titleMatch = withoutQuery.match(/\/titles\/(\d+)(?:-([^/]+))?/i);
    if (titleMatch) {
      return { id: titleMatch[1], slug: titleMatch[2] || '' };
    }
    if (/^\d+$/.test(withoutQuery)) return { id: withoutQuery, slug: titleSlugs[withoutQuery] || '' };
    var slug = withoutQuery.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '');
    if (slug.indexOf('/') >= 0) slug = slug.split('/').pop();
    return { id: '', slug: slug };
  }

  async function resolveTitleRef(input) {
    var parsed = parseTitleRef(input);
    if (parsed.id) return parsed;
    if (!parsed.slug) return parsed;
    try {
      var results = await searchResults(parsed.slug, 1);
      var wanted = parsed.slug.toLowerCase();
      for (var i = 0; i < results.length; i += 1) {
        var candidate = results[i];
        var candidateSlug = String(candidate.href || '').split('/').pop().replace(/^\d+-/, '').toLowerCase();
        if (candidateSlug === wanted || String(candidate.title || '').toLowerCase() === wanted) {
          return parseTitleRef(candidate.href);
        }
      }
    } catch (_) {}
    return parsed;
  }

  async function loadTitlePage(input) {
    var ref = await resolveTitleRef(input);
    var cacheKey = ref.id + ':' + ref.slug;
    if (cacheKey !== ':' && titlePageCache[cacheKey]) return titlePageCache[cacheKey];

    var candidates = [];
    if (ref.id && ref.slug) candidates.push(canonicalTitleHref(ref.id, ref.slug));
    if (ref.id) candidates.push(BASE_URL + '/en/titles/' + ref.id);
    if (ref.slug) candidates.push(BASE_URL + '/en/titles/' + ref.slug);

    var seen = Object.create(null);
    for (var i = 0; i < candidates.length; i += 1) {
      var url = candidates[i];
      if (seen[url]) continue;
      seen[url] = true;
      try {
        var page = await requestPage(url);
        var props = propsOf(page);
        var title = props.title && typeof props.title === 'object'
          ? props.title
          : (titleRecords(props)[0] || null);
        if (title && title.id) {
          var loaded = { page: page, props: props, title: title, ref: ref, url: url };
          titlePageCache[cacheKey] = loaded;
          return loaded;
        }
      } catch (_) {}
    }
    throw new Error('StreamingUnity title could not be loaded');
  }

  async function discoveryHome() {
    try {
      var page = await requestPage(BASE_URL + '/');
      var props = propsOf(page);
      var sliders = Array.isArray(props.sliders) ? props.sliders : [];
      var sections = [];
      sliders.forEach(function (slider) {
        var name = cleanText(slider && slider.name).toLowerCase();
        var items = mapRecords(
          slider && Array.isArray(slider.titles) ? slider.titles : [],
          props,
          { isTrending: name === 'trending', isPopular: name === 'top10' }
        );
        if (!items.length) return;
        var style = name === 'top10' ? 'top10' : (name === 'trending' ? 'hero' : 'poster');
        sections.push({
          id: 'streamingunity_' + (name || 'titles'),
          title: cleanText(slider && (slider.label || slider.name)) || 'Titles',
          style: style,
          items: items,
          viewAll: { mode: 'feed', feedId: name || 'trending' }
        });
      });
      return { sections: sections };
    } catch (error) {
      log('discoveryHome failed');
      return { sections: [] };
    }
  }

  function feedRoute(feedId) {
    var raw = cleanText(feedId).toLowerCase();
    var aliases = {
      popular: 'trending',
      featured: 'trending',
      recent: 'latest',
      shows: 'tv-shows',
      tv: 'tv-shows'
    };
    var target = aliases[raw] || raw || 'trending';
    if (target === 'movies' || target === 'tv-shows') return BASE_URL + '/en/' + target;
    return BASE_URL + '/en/browse/' + target;
  }

  async function discoveryFeed(feedId, page) {
    var pageNumber = positiveInt(page, 1);
    try {
      var route = feedRoute(feedId);
      var separator = route.indexOf('?') >= 0 ? '&' : '?';
      var pageData = await requestPage(route + separator + 'page=' + pageNumber);
      var props = propsOf(pageData);
      var rawItems = titleRecords(props);
      var target = cleanText(feedId).toLowerCase();
      if (target === 'popular' || target === 'featured') target = 'trending';
      var items = mapRecords(rawItems, props, {
        isTrending: target === 'trending',
        isPopular: target === 'top10'
      });
      var total = numberOr(props.totalCount || props.total_count, 0);
      var hasMore;
      if (target === 'top10') {
        hasMore = false;
      } else if (total > 0) {
        hasMore = pageNumber * items.length < total;
      } else {
        hasMore = items.length >= 60;
      }
      return {
        feedId: feedId || 'trending',
        page: pageNumber,
        items: items,
        hasMore: Boolean(hasMore)
      };
    } catch (error) {
      log('discoveryFeed failed for ' + String(feedId || 'trending'));
      return { feedId: feedId || 'trending', page: pageNumber, items: [], hasMore: false };
    }
  }

  async function searchResults(query, page) {
    var cleanQuery = cleanText(query);
    var pageNumber = positiveInt(page, 1);
    if (!cleanQuery) {
      var homeFeed = await discoveryFeed('trending', pageNumber);
      return homeFeed.items || [];
    }
    try {
      var url = BASE_URL + '/en/search?q=' + encodeURIComponent(cleanQuery);
      if (pageNumber > 1) url += '&page=' + pageNumber;
      var pageData = await requestPage(url);
      var props = propsOf(pageData);
      return mapRecords(titleRecords(props), props, {});
    } catch (error) {
      log('searchResults failed');
      return [];
    }
  }

  function detailsFromLoaded(loaded) {
    var title = loaded.title;
    var props = loaded.props;
    var item = mapTitleRecord(title, props, {});
    if (!item) return null;
    item.href = canonicalTitleHref(title.id, title.slug || loaded.ref.slug || title.name);
    item.url = item.href;
    item.scwsId = cleanText(title.scws_id);
    item.originalLanguage = cleanText(title.original_language);
    item.status = cleanText(title.status);
    item.age = numberOr(title.age, 0);
    item.imdbId = cleanText(title.imdb_id);
    item.tmdbId = cleanText(title.tmdb_id);
    item.preview = title.preview && typeof title.preview === 'object'
      ? cleanText(title.preview.embed_url || title.preview.url)
      : '';
    var loadedSeason = props.loadedSeason;
    item.loadedSeasonNumber = loadedSeason ? positiveInt(loadedSeason.number, 0) : 0;
    item.episodesCount = loadedSeason && Array.isArray(loadedSeason.episodes)
      ? loadedSeason.episodes.length
      : 0;
    return item;
  }

  async function extractDetails(urlOrId) {
    try {
      var loaded = await loadTitlePage(urlOrId);
      return detailsFromLoaded(loaded);
    } catch (error) {
      return {
        id: String(urlOrId || ''),
        href: String(urlOrId || ''),
        title: 'Unavailable',
        name: 'Unavailable',
        description: '',
        synopsis: '',
        image: '',
        poster: '',
        backdrop: '',
        genres: [],
        type: 'movie',
        isMovie: true,
        year: 0,
        rating: 0
      };
    }
  }

  function makeMovieHref(title, props) {
    var titleId = cleanText(title && title.id);
    var providerId = cleanText(title && title.scws_id) || titleId;
    var hasDub = truthyFlag(title && title.dub_ita, false) ? '1' : '0';
    var slug = slugFor(title, titleId);
    return '/streamingunity/movie/' + titleId + '/' + providerId + '/' + hasDub + '/' + slug;
  }

  function makeEpisodeHref(title, seasonNumber, episode, props) {
    var titleId = cleanText(title && title.id);
    var episodeId = cleanText(episode && episode.id);
    var providerId = cleanText(episode && episode.scws_id) || episodeId;
    var hasDub = truthyFlag(episode && episode.dub_ita, false) ? '1' : '0';
    var slug = slugFor(title, titleId);
    return '/streamingunity/episode/' + titleId + '/' + String(seasonNumber) + '/' +
      episodeId + '/' + providerId + '/' + hasDub + '/' + slug;
  }

  function seasonList(title, props) {
    var output = [];
    if (title && Array.isArray(title.seasons)) {
      title.seasons.forEach(function (season, index) {
        var number = positiveInt(season && (season.number || season.season_number), index + 1);
        if (output.every(function (existing) { return existing.number !== number; })) {
          output.push({ number: number, id: cleanText(season && season.id) });
        }
      });
    }
    if (!output.length && props && props.loadedSeason) {
      output.push({ number: positiveInt(props.loadedSeason.number, 1), id: cleanText(props.loadedSeason.id) });
    }
    output.sort(function (a, b) { return a.number - b.number; });
    return output;
  }

  function mapSeasonEpisodes(title, props, seasonNumber, episodeRows, parentPoster) {
    var output = [];
    var rows = Array.isArray(episodeRows) ? episodeRows.slice() : [];
    rows.sort(function (a, b) {
      return positiveInt(a && a.number, 0) - positiveInt(b && b.number, 0);
    });
    rows.forEach(function (episode) {
      var episodeId = cleanText(episode && episode.id);
      var number = positiveInt(episode && episode.number, 0);
      if (!episodeId || !number) return;
      var name = cleanText(episode.name || episode.title) || ('Episode ' + number);
      var image = pickImage(episode, ['cover', 'poster', 'cover_mobile'], cdnFromProps(props || {})) || parentPoster;
      var subAvailable = episode.audio_orig === undefined && episode.sub_ita === undefined
        ? true
        : truthyFlag(episode.audio_orig, false) || truthyFlag(episode.sub_ita, false);
      var dubAvailable = truthyFlag(episode.dub_ita, false);
      var href = makeEpisodeHref(title, seasonNumber, episode, props);
      output.push({
        id: href,
        href: href,
        number: number,
        episodeNumber: number,
        season: seasonNumber,
        seasonNumber: seasonNumber,
        title: 'S' + seasonNumber + 'E' + number + ' - ' + name,
        name: name,
        image: image,
        poster: image,
        thumbnail: image,
        description: cleanText(episode.plot),
        duration: numberOr(episode.duration, 0),
        subAvailable: subAvailable,
        dubAvailable: dubAvailable
      });
    });
    return output;
  }

  async function seasonPage(title, loadedProps, seasonNumber) {
    var loadedSeason = loadedProps && loadedProps.loadedSeason;
    if (loadedSeason && positiveInt(loadedSeason.number, 0) === seasonNumber) {
      return loadedProps;
    }
    var href = canonicalTitleHref(title.id, title.slug || title.name) + '/season-' + seasonNumber;
    try {
      var page = await requestPage(href);
      return propsOf(page);
    } catch (_) {
      return null;
    }
  }

  async function extractEpisodes(seriesId) {
    try {
      var loaded = await loadTitlePage(seriesId);
      var title = loaded.title;
      var props = loaded.props;
      var type = cleanText(title.type || 'movie').toLowerCase();
      var poster = pickImage(title, ['poster', 'cover_mobile', 'cover', 'background'], cdnFromProps(props));
      if (type === 'movie' || (!title.seasons_count && !Array.isArray(title.seasons))) {
        var movieHref = makeMovieHref(title, props);
        return [{
          id: movieHref,
          href: movieHref,
          number: 1,
          episodeNumber: 1,
          season: 1,
          seasonNumber: 1,
          title: cleanText(title.name || title.original_name) || 'Movie',
          name: cleanText(title.name || title.original_name) || 'Movie',
          image: poster,
          poster: poster,
          thumbnail: poster,
          description: cleanText(title.plot),
          duration: numberOr(title.runtime, 0),
          subAvailable: true,
          dubAvailable: truthyFlag(title.dub_ita, false)
        }];
      }

      var seasons = seasonList(title, props);
      var episodes = [];
      for (var i = 0; i < seasons.length; i += 1) {
        var seasonProps = await seasonPage(title, props, seasons[i].number);
        if (!seasonProps || !seasonProps.loadedSeason) continue;
        var season = seasonProps.loadedSeason;
        var rows = Array.isArray(season.episodes) ? season.episodes : [];
        episodes = episodes.concat(mapSeasonEpisodes(title, seasonProps, seasons[i].number, rows, poster));
      }
      return episodes;
    } catch (error) {
      log('extractEpisodes failed');
      return [];
    }
  }

  function parseEpisodeRef(input) {
    var raw = decodeUrlPart(cleanText(input)).split(/[?#]/)[0];
    var episode = raw.match(/\/streamingunity\/episode\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/([^/]+)/i);
    if (episode) {
      return {
        kind: 'episode',
        titleId: episode[1],
        season: positiveInt(episode[2], 1),
        mediaId: episode[3],
        providerId: episode[4] === '0' ? '' : episode[4],
        dubAvailable: episode[5] === '1',
        slug: episode[6]
      };
    }
    var movie = raw.match(/\/streamingunity\/movie\/(\d+)\/(\d+)\/(\d+)\/([^/]+)/i);
    if (movie) {
      return {
        kind: 'movie',
        titleId: movie[1],
        season: 1,
        mediaId: movie[1],
        providerId: movie[2] === '0' ? '' : movie[2],
        dubAvailable: movie[3] === '1',
        slug: movie[4]
      };
    }
    var iframe = raw.match(/\/iframe\/(\d+)/i);
    if (iframe) {
      return {
        kind: 'unknown',
        titleId: iframe[1],
        season: 1,
        mediaId: iframe[1],
        providerId: '',
        dubAvailable: true,
        slug: ''
      };
    }
    return null;
  }

  function providerLanguage(lang) {
    var requested = cleanText(lang || 'sub').toLowerCase();
    if (requested === 'dub' || requested === 'ita' || requested === 'it' || requested === 'vf') return 'ita';
    if (requested === 'de' || requested === 'ger') return 'ger';
    if (requested === 'fr' || requested === 'fra') return 'fre';
    if (requested === 'es' || requested === 'spa') return 'spa';
    if (requested === 'ja' || requested === 'jpn') return 'jpn';
    return 'en';
  }

  function extractVixEmbedUrl(html) {
    var source = String(html || '').replace(/\\\//g, '/');
    var matches = source.match(/<iframe[^>]+src=["']([^"']+)["']/ig) || [];
    for (var i = 0; i < matches.length; i += 1) {
      var match = matches[i].match(/src=["']([^"']+)["']/i);
      var candidate = absoluteUrl(cleanText(match && match[1]).replace(/&amp;/g, '&'), BASE_URL);
      if (/^https:\/\/vixcloud\.co\//i.test(candidate)) return candidate;
    }
    var direct = source.match(/https?:\/\/vixcloud\.co\/(?:embed|e)\/[^"'<>\s]+/i);
    return direct ? cleanText(direct[0]).replace(/&amp;/g, '&') : '';
  }

  function unescapeJs(value) {
    return String(value || '')
      .replace(/\\u0026/gi, '&')
      .replace(/\\\//g, '/')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }

  function vixConfig(html) {
    var source = String(html || '');
    var streams = [];
    var streamMatch = source.match(/window\.streams\s*=\s*(\[[\s\S]*?\])\s*;/i);
    if (streamMatch) {
      try {
        var parsed = JSON.parse(unescapeJs(streamMatch[1]));
        if (Array.isArray(parsed)) streams = parsed;
      } catch (_) {}
    }
    streams.sort(function (a, b) {
      var activeA = truthyFlag(a && a.active, false) ? 1 : 0;
      var activeB = truthyFlag(b && b.active, false) ? 1 : 0;
      return activeB - activeA;
    });
    var tokenMatch = source.match(/["']token["']\s*:\s*["']([^"']+)["']/i);
    var expiresMatch = source.match(/["']expires["']\s*:\s*["']([^"']+)["']/i);
    var asnMatch = source.match(/["']asn["']\s*:\s*["']([^"']*)["']/i);
    var masterMatch = source.match(/window\.masterPlaylist\s*=\s*\{[\s\S]*?\burl\s*:\s*["']([^"']+)["']/i);
    var videoMatch = source.match(/window\.video\s*=\s*\{[\s\S]*?\bid\s*:\s*["']([^"']+)["']/i);
    var bases = [];
    streams.forEach(function (stream) {
      var value = unescapeJs(stream && stream.url);
      if (value && value.indexOf('/playlist/') >= 0) bases.push(value);
    });
    if (masterMatch && masterMatch[1]) bases.push(unescapeJs(masterMatch[1]));
    return {
      streams: bases,
      token: tokenMatch ? tokenMatch[1] : '',
      expires: expiresMatch ? expiresMatch[1] : '',
      asn: asnMatch ? asnMatch[1] : '',
      mediaId: videoMatch ? videoMatch[1] : '',
      canPlayFhd: /window\.canPlayFHD\s*=\s*true/i.test(source)
    };
  }

  function appendQuery(url, key, value) {
    var result = String(url || '');
    if (!value || new RegExp('(?:[?&])' + key + '=', 'i').test(result)) return result;
    return result + (result.indexOf('?') >= 0 ? '&' : '?') + key + '=' + encodeURIComponent(String(value));
  }

  function buildPlaylistUrl(base, config, providerLang) {
    var url = cleanText(base).replace(/&amp;/g, '&');
    url = appendQuery(url, 'token', config.token);
    url = appendQuery(url, 'expires', config.expires);
    url = appendQuery(url, 'asn', config.asn);
    if (config.canPlayFhd) url = appendQuery(url, 'h', '1');
    url = appendQuery(url, 'lang', providerLang);
    return url;
  }

  function parseAttributes(line) {
    var attributes = {};
    var matcher = /([A-Z0-9-]+)=("(?:[^"\\]|\\.)*"|[^,]*)/gi;
    var match;
    while ((match = matcher.exec(String(line || ''))) !== null) {
      var value = String(match[2] || '').trim();
      if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1).replace(/\\"/g, '"');
      }
      attributes[String(match[1]).toUpperCase()] = value;
    }
    return attributes;
  }

  function parseMasterMetadata(master, playlistUrl) {
    var subtitles = [];
    var audioTracks = [];
    var lines = String(master || '').split(/\r?\n/);
    var seenSubtitles = Object.create(null);
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (trimmed.indexOf('#EXT-X-MEDIA:') !== 0) return;
      var attributes = parseAttributes(trimmed.substring('#EXT-X-MEDIA:'.length));
      var uri = mediaUrl(attributes.URI, playlistUrl);
      var type = String(attributes.TYPE || '').toUpperCase();
      if (!uri) return;
      if (type === 'AUDIO') {
        audioTracks.push({
          label: cleanText(attributes.NAME || attributes.LANGUAGE || 'Audio'),
          language: languageCode(attributes.LANGUAGE),
          default: String(attributes.DEFAULT || '').toUpperCase() === 'YES',
          group: attributes['GROUP-ID'] || '',
          uri: uri
        });
      }
      if (type !== 'SUBTITLES' || seenSubtitles[uri]) return;
      seenSubtitles[uri] = true;
      var label = cleanText(attributes.NAME || attributes.LANGUAGE || 'Subtitle');
      var lang = languageCode(attributes.LANGUAGE);
      subtitles.push({
        id: uri,
        label: label,
        language: lang,
        srclang: lang,
        file: uri,
        url: uri,
        kind: 'subtitle',
        default: String(attributes.DEFAULT || '').toUpperCase() === 'YES',
        forced: String(attributes.FORCED || '').toUpperCase() === 'YES' || /^forced-/i.test(attributes.LANGUAGE || '') || /\[forced\]/i.test(label),
        headers: {
          'User-Agent': USER_AGENT,
          Referer: VIX_BASE + '/',
          Origin: VIX_BASE
        }
      });
    });
    return { subtitles: subtitles, audioTracks: audioTracks };
  }

  function mediaLines(body, base) {
    return String(body || '').split(/\r?\n/).map(function (line) { return line.trim(); })
      .filter(function (line) { return line && line.charAt(0) !== '#'; })
      .map(function (line) { return mediaUrl(line, base); }).filter(Boolean);
  }

  function variantsOf(master, base) {
    var lines = String(master || '').split(/\r?\n/), variants = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim().indexOf('#EXT-X-STREAM-INF:') !== 0) continue;
      var attrs = parseAttributes(lines[i].trim().substring(18));
      for (var j = i + 1; j < lines.length; j++) {
        var next = lines[j].trim();
        if (!next) continue;
        if (next.charAt(0) === '#') break;
        variants.push({ url: mediaUrl(next, base), audioGroup: attrs.AUDIO || '', codecs: attrs.CODECS || '',
          height: positiveInt(String(attrs.RESOLUTION || '').split('x')[1], 0) });
        break;
      }
    }
    return variants;
  }

  async function checkRendition(url, deadline) {
    var headers = hlsHeaders(VIX_BASE + '/');
    var playlist = await requestText(url, headers, deadline);
    if (!playlist.ok || !/^#EXTM3U/.test(playlist.text.trim()) || !/#EXTINF:/.test(playlist.text)) return false;
    var segments = mediaLines(playlist.text, url);
    if (!segments.length || /\.(jpg|jpeg|png|webp)(?:[?#]|$)/i.test(segments[0])) return false;
    var key = playlist.text.match(/#EXT-X-KEY:([^\n]+)/);
    if (key) {
      var attrs = parseAttributes(key[1]);
      if (attrs.METHOD !== 'NONE') {
        if (attrs.METHOD !== 'AES-128' || (attrs.KEYFORMAT && attrs.KEYFORMAT !== 'identity')) return false;
        var keyUrl = mediaUrl(attrs.URI, url);
        if (!keyUrl) return false;
        var keyResponse = await requestText(keyUrl, Object.assign({}, headers, { Range: 'bytes=0-15' }), deadline);
        if (!keyResponse.ok || /text\/html/i.test(keyResponse.headers['content-type'] || '')) return false;
      }
    }
    var probe = await requestText(segments[0], Object.assign({}, headers, { Range: 'bytes=0-1023' }), deadline);
    return probe.ok && !/text\/html|application\/json|image\//i.test(probe.headers['content-type'] || '') && !/^\s*(?:<!doctype|<html)/i.test(probe.text);
  }

  async function checkMaster(body, url, metadata, requestedLanguage, deadline, originalLanguage) {
    var variants = variantsOf(body, url);
    if (!variants.length) return null; // Do not pass unchecked video-only playlists as complete media.
    var language = languageCode(requestedLanguage);
    var audio = metadata.audioTracks.filter(function (track) { return track.language === language; });
    if (!audio.length) {
      // A single original-language track may be muxed into each video variant.
      // Never use this fallback to replace an explicitly different audio track.
      if (metadata.audioTracks.length || languageCode(originalLanguage) !== language || !originalLanguage) return null;
      var muxed = variants.filter(function (variant) {
        return !variant.audioGroup && /(?:^|,)\s*(?:mp4a\.|ac-3|ec-3|opus)(?:[^,]*)(?:,|$)/i.test(variant.codecs) &&
          /(?:avc1|avc3|hev1|hvc1|av01|vp09)\./i.test(variant.codecs);
      });
      muxed.sort(function (a, b) { return a.height - b.height; });
      if (!muxed.length || !await checkRendition(muxed[0].url, deadline)) return null;
      return { audio: { language: language, muxed: true }, variants: muxed };
    }
    var selectedAudio = null;
    for (var a = 0; a < audio.length; a++) {
      if (await checkRendition(audio[a].uri, deadline)) { selectedAudio = audio[a]; break; }
    }
    if (!selectedAudio) return null;
    var matching = variants.filter(function (variant) { return variant.audioGroup === selectedAudio.group; });
    matching.sort(function (a, b) { return a.height - b.height; });
    if (!matching.length || !await checkRendition(matching[0].url, deadline)) return null;
    return { audio: selectedAudio, variants: matching };
  }

  async function captionFiles(tracks, deadline) {
    var result = [];
    // Caption playlists are not WebVTT files. Only unwrap a complete, single-file VOD.
    for (var i = 0; i < tracks.length; i += 2) {
      var batch = await Promise.all(tracks.slice(i, i + 2).map(async function (track) {
        var response = await requestText(track.url, track.headers, deadline);
        if (!response.ok) return null;
        var url = track.url, body = response.text.trim();
        if (/^#EXTM3U/.test(body)) {
          var files = mediaLines(body, url);
          if (files.length !== 1 || !/#EXT-X-ENDLIST/.test(body) || /#EXT-X-KEY/.test(body)) return null;
          url = files[0];
          response = await requestText(url, track.headers, deadline);
          if (!response.ok) return null;
          body = response.text.trim();
        }
        if (!/^\uFEFF?WEBVTT/.test(body) || body.indexOf('-->') < 0) return null;
        return Object.assign({}, track, { id: url, file: url, url: url });
      }));
      result = result.concat(batch.filter(Boolean));
    }
    return result;
  }

  function hlsHeaders(referer) {
    return {
      'User-Agent': USER_AGENT,
      Accept: HLS_ACCEPT,
      Referer: referer || VIX_BASE + '/',
      Origin: VIX_BASE
    };
  }

  function iframeCandidates(ref, mediaId) {
    var candidates = [];
    var titleId = cleanText(ref && ref.titleId);
    var episodeId = cleanText(ref && ref.mediaId);

    // StreamingUnity's current episode router is keyed by title ID and takes
    // the episode ID as a query parameter. The previous implementation used
    // the episode ID as the route ID, which returns 404 for current titles.
    if (ref && ref.kind === 'episode' && titleId && episodeId) {
      candidates.push(BASE_URL + '/en/iframe/' + encodeURIComponent(titleId) +
        '?episode_id=' + encodeURIComponent(episodeId) + '&next_episode=1');
    } else if (ref && ref.kind === 'movie' && titleId) {
      candidates.push(BASE_URL + '/en/iframe/' + encodeURIComponent(titleId));
    } else if (ref && ref.kind === 'unknown' && mediaId) {
      candidates.push(BASE_URL + '/en/iframe/' + encodeURIComponent(String(mediaId)));
    }

    // Saved module links retain title and episode identity. Never substitute a
    // provider/episode ID into a title route: it can return an unrelated movie.

    var unique = [];
    var seen = Object.create(null);
    candidates.forEach(function (candidate) {
      if (!candidate || seen[candidate]) return;
      seen[candidate] = true;
      unique.push(candidate);
    });
    return unique;
  }

  async function resolveMediaId(mediaId, providerLanguage, ref) {
    var deadline = Date.now() + 24000;
    var iframeUrls = iframeCandidates(ref, mediaId);
    var lastError = null;
    var watchId = cleanText(ref && ref.titleId) || String(mediaId || '');

    for (var iframeIndex = 0; iframeIndex < iframeUrls.length; iframeIndex += 1) {
      var iframeUrl = iframeUrls[iframeIndex];
      var iframeResult = await requestText(iframeUrl, {
        Accept: PAGE_ACCEPT,
        Referer: BASE_URL + '/en/watch/' + encodeURIComponent(watchId)
      }, deadline);
      if (!iframeResult.ok || !iframeResult.text) {
        lastError = new Error('iframe unavailable (' + String(iframeResult.status || 0) + ')');
        continue;
      }
      var embedUrl = extractVixEmbedUrl(iframeResult.text);
      if (!embedUrl) {
        lastError = new Error('provider embed missing');
        continue;
      }

      var embedResult = await requestText(embedUrl, {
        Accept: PAGE_ACCEPT,
        Referer: iframeUrl
      }, deadline);
      if (!embedResult.ok || !embedResult.text) {
        lastError = new Error('provider embed unavailable');
        continue;
      }
      var config = vixConfig(embedResult.text);
      var bases = config.streams.slice();
      if (config.mediaId && bases.length === 0) {
        bases.push(VIX_BASE + '/playlist/' + config.mediaId + '?b=1');
      }
      var seen = Object.create(null);
      var alternatives = [];
      for (var i = 0; i < bases.length; i += 1) {
        if (Date.now() >= deadline) break;
        var playlistUrl = buildPlaylistUrl(bases[i], config, providerLanguage);
        if (!playlistUrl || seen[playlistUrl]) continue;
        seen[playlistUrl] = true;
        var playlistResult = await requestText(playlistUrl, hlsHeaders(VIX_BASE + '/'), deadline);
        var playlistBody = playlistResult.text || '';
        if (!playlistResult.ok || playlistBody.indexOf('#EXTM3U') < 0) continue;
        var metadata = parseMasterMetadata(playlistBody, playlistUrl);
        var originalLanguage = '';
        if (!metadata.audioTracks.length && ref && ref.dubAvailable === false && ref.slug) {
          try {
            var titlePage = await loadTitlePage(canonicalTitleHref(ref.titleId, ref.slug));
            if (String(titlePage.title.id) === String(ref.titleId)) originalLanguage = titlePage.title.original_language;
          } catch (_) {}
        }
        var checked = await checkMaster(playlistBody, playlistUrl, metadata, providerLanguage, deadline, originalLanguage);
        if (!checked) continue;
        alternatives.push({
          url: playlistUrl,
          master: playlistBody,
          subtitles: await captionFiles(metadata.subtitles.filter(function (track) {
            return track.language === 'en' && !track.forced;
          }).slice(0, 1), deadline),
          audioTracks: metadata.audioTracks,
          embedUrl: embedUrl,
          audioLanguage: checked.audio.language
        });
      }
      if (alternatives.length) return alternatives;
      lastError = new Error('no playable HLS playlist');
    }
    throw lastError || new Error('iframe unavailable');
  }

  async function extractStreamUrl(episodeHref, lang) {
    var requested = cleanText(lang || 'sub').toLowerCase() || 'sub';
    var ref = parseEpisodeRef(episodeHref);
    if (!ref) {
      return {
        streams: [],
        subtitles: [],
        lang: requested,
        error: { message: 'Invalid StreamingUnity episode reference' }
      };
    }
    if ((requested === 'dub' || requested === 'vf') && ref.dubAvailable === false) {
      return {
        streams: [],
        subtitles: [],
        lang: requested,
        error: { message: 'This title has no verified Italian dub track' }
      };
    }

    var providerLang = providerLanguage(requested);
    var ids = [ref.mediaId];
    var lastError = null;
    for (var i = 0; i < ids.length; i += 1) {
      try {
        var alternatives = await resolveMediaId(ids[i], providerLang, ref);
        var resolved = alternatives[0];
        var headers = hlsHeaders(VIX_BASE + '/');
        var primary = {
          label: 'Auto (' + resolved.audioLanguage + ')',
          url: resolved.url,
          quality: 'Auto',
          streamType: 'hls',
          kind: 'hls',
          provider: 'streamingunity-vixcloud',
          headers: headers
        };
        return {
          url: resolved.url,
          stream: resolved.url,
          streams: [primary],
          headers: headers,
          streamType: 'hls',
          quality: 'Auto',
          lang: requested,
          audioLanguage: resolved.audioLanguage,
          servers: alternatives.map(function (server, index) {
            return { id: 'vixcloud-' + (index + 1), name: 'VixCloud ' + (index + 1) + ' (' + server.audioLanguage + ')',
              url: server.url, headers: headers, streamType: 'hls', quality: 'Auto',
              lang: requested, subtitles: server.subtitles, audioLanguage: server.audioLanguage };
          }),
          audioTracks: resolved.audioTracks,
          subtitles: resolved.subtitles
        };
      } catch (error) {
        lastError = error;
        log('provider candidate failed for media ' + ids[i]);
      }
    }
    return {
      streams: [],
      subtitles: [],
      lang: requested,
      error: {
        message: 'StreamingUnity has no playable public stream right now' +
          (lastError && lastError.message ? ': ' + lastError.message : '')
      }
    };
  }

  unity.searchResults = searchResults;
  unity.extractDetails = extractDetails;
  unity.extractEpisodes = extractEpisodes;
  unity.extractStreamUrl = extractStreamUrl;
  unity.discoveryHome = discoveryHome;
  unity.discoveryFeed = discoveryFeed;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      searchResults: searchResults,
      extractDetails: extractDetails,
      extractEpisodes: extractEpisodes,
      extractStreamUrl: extractStreamUrl,
      discoveryHome: discoveryHome,
      discoveryFeed: discoveryFeed
    };
  }
})();

(() => {
  'use strict';

  const TMDB = 'https://api.themoviedb.org/3';
  const TMDB_KEY = 'e1a8efff4415028c5c266b3fcd50db6e';
  const IMAGE = 'https://image.tmdb.org/t/p';
  const MOVIES_BACKENDS = [
    'https://198.244.149.250.sslip.io/movies/resolve',
  ];
  // Stream Unity / VixCloud 403s from every VPS kitchen. Resolve it on the
  // phone first, then fall through to the OVH VideoEasy/STCine brain.
  const STREAMINGUNITY_BASE = 'https://streamingunity.vip';
  const VIX_BASE = 'https://vixcloud.co';
  const SU_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';
  const SU_PAGE_ACCEPT =
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
  const SU_HLS_ACCEPT =
    'application/vnd.apple.mpegurl,application/x-mpegURL,application/octet-stream,text/plain,*/*;q=0.8';
  // Public subtitle proxy. Wyzie keys stay on the One server, never in this ZIP.
  const SUBS_API = 'https://one.synthetiq.uk/v1/subs';
  const CINEJOY_SUBS = 'https://subtitles.shegu.st';
  // Private release switch: false restores Wyzie-first behavior.
  const CINEJOY_FIRST = true;
  const MAX_SUBTITLE_LIST_CACHE = 48;
  const cinejoyCache = Object.create(null);
  const cinejoyInflight = Object.create(null);
  const USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
  const SUBTITLE_HEADERS = {
    'User-Agent': USER_AGENT,
    Accept: 'text/vtt,text/plain,application/x-subrip,*/*',
    Origin: 'https://www.opensubtitles.org',
    Referer: 'https://www.opensubtitles.org/',
  };
  // Movies exposes a small language menu, but resolves only the selected
  // subtitle language. This keeps stream startup and downloads cheap.
  const MAX_SUBS_TOTAL = 64;
  const MAX_SUBS_PER_LANG = 1;
  const MAX_HYDRATED_SUBS = 1;
  const MAX_MEDIA_STREAMS = 6;
  const MAX_SUBTITLE_TEXT_CACHE = 12;
  const SUBTITLE_LIST_TTL_MS = 10 * 60 * 1000;
  const SUBTITLE_TEXT_TTL_MS = 30 * 60 * 1000;
  const subtitleListCache = Object.create(null);
  const subtitleListInflight = Object.create(null);
  const subtitleTextCache = Object.create(null);
  const subtitleTextInflight = Object.create(null);
  const detailsCache = Object.create(null);
  const seasonCache = Object.create(null);
  const seasonInflight = Object.create(null);

  async function readBody(response) {
    if (!response) return '';
    if (typeof response.body === 'string' && response.body.length) return response.body;
    if (response.json && typeof response.json !== 'function') {
      try { return JSON.stringify(response.json); } catch (_) {}
    }
    if (typeof response.text === 'function') {
      try {
        const text = await response.text();
        if (typeof text === 'string' && text.length) return text;
      } catch (_) {}
    }
    if (typeof response.json === 'function') {
      try { return JSON.stringify(await response.json()); } catch (_) {}
    }
    return '';
  }

  async function requestJson(path) {
    const url = TMDB + path + (path.indexOf('?') >= 0 ? '&' : '?') +
      'api_key=' + encodeURIComponent(TMDB_KEY) + '&language=en-US';
    const headers = {
      Accept: 'application/json,*/*',
      'User-Agent': USER_AGENT,
      Referer: 'https://www.themoviedb.org/',
    };
    let response;
    if (typeof fetchv2 === 'function') response = await fetchv2(url, headers, 'GET', null);
    else if (typeof fetch === 'function') response = await fetch(url, { headers });
    else throw new Error('No fetch available');
    const status = Number((response && response.status) || 0);
    if (status && (status < 200 || status >= 400)) throw new Error('tmdb_http_' + status);
    const body = await readBody(response);
    if (!body) return null;
    try { return JSON.parse(body); } catch (_) { return null; }
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function twoDigits(value) {
    const text = String(value);
    return text.length < 2 ? '0' + text : text;
  }

  function todayStamp() {
    const date = new Date();
    return date.getFullYear() + '-' + twoDigits(date.getMonth() + 1) + '-' + twoDigits(date.getDate());
  }

  function hasAired(airDate) {
    const stamp = String(airDate || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stamp)) return true;
    return stamp <= todayStamp();
  }

  function withTimeout(promise, ms, fallback) {
    if (typeof setTimeout !== 'function') return promise;
    let timer = null;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), Math.max(1, Number(ms) || 0));
    });
    return Promise.race([promise, timeout]).then((value) => {
      if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
      return value;
    }, (error) => {
      if (timer && typeof clearTimeout === 'function') clearTimeout(timer);
      throw error;
    });
  }

  function poster(path, size) {
    if (!path) return '';
    if (/^https?:\/\//i.test(String(path))) return String(path);
    return IMAGE + '/' + (size || 'w500') + (String(path).charAt(0) === '/' ? path : '/' + path);
  }

  function href(type, id, season, episode) {
    let out = 'https://www.themoviedb.org/' + type + '/' + id;
    if (type === 'tv' && season != null && episode != null) {
      out += '?season=' + Number(season) + '&episode=' + Number(episode);
    }
    return out;
  }

  function parseHref(value) {
    const raw = String(value || '').trim();
    let match = raw.match(/themoviedb\.org\/(movie|tv)\/(\d+)(?:\?[^#]*season=(\d+)&episode=(\d+))?/i);
    if (!match) match = raw.match(/^(movie|tv):(\d+)(?::(\d+):(\d+))?$/i);
    if (!match) return null;
    return {
      type: match[1].toLowerCase(),
      id: match[2],
      season: match[3] ? Number(match[3]) : null,
      episode: match[4] ? Number(match[4]) : null,
    };
  }

  function mapItem(row, forcedType) {
    if (!row) return null;
    const type = String(forcedType || row.media_type || '').toLowerCase();
    if (type !== 'movie' && type !== 'tv') return null;
    if (row.adult === true) return null;
    const id = Number(row.id);
    const title = clean(row.title || row.name || row.original_title || row.original_name);
    if (!id || !title) return null;
    const year = String(row.release_date || row.first_air_date || '').slice(0, 4);
    const image = poster(row.poster_path || row.backdrop_path);
    return {
      id: href(type, id),
      href: href(type, id),
      title: title + (year ? ' (' + year + ')' : ''),
      image,
      poster: image,
      type,
      mediaType: type,
      year: year || undefined,
    };
  }

  async function searchResults(query, page) {
    const q = clean(query);
    const pageNumber = Math.max(1, Number(page || 0) + 1);
    const path = q
      ? '/search/multi?query=' + encodeURIComponent(q) +
          '&include_adult=false&page=' + pageNumber
      : '/trending/all/week?page=' + pageNumber;
    const data = await withTimeout(requestJson(path), 8000, null).catch(() => null);
    return ((data && data.results) || []).map((row) => mapItem(row)).filter(Boolean).slice(0, 40);
  }

  async function catalogueRoute(route, mediaType, page, extra) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const data = await withTimeout(
      requestJson(route + '?page=' + pageNumber + (extra || '')),
      8000,
      null,
    ).catch(() => null);
    return {
      items: ((data && data.results) || []).map((row) => mapItem(row, mediaType)).filter(Boolean),
      page: pageNumber,
      hasMore: pageNumber < Number((data && data.total_pages) || 1),
    };
  }

  async function catalogue(type, path, page) {
    return catalogueRoute('/' + type + '/' + path, type, page);
  }

  async function discoveryHome() {
    const [trending, movies, tv, topMovies, topTv, nowPlaying, upcoming, action, comedy, animation] =
      await Promise.all([
        withTimeout(requestJson('/trending/all/week?page=1'), 8000, null).catch(() => null),
        catalogueRoute('/movie/popular', 'movie', 1),
        catalogueRoute('/tv/popular', 'tv', 1),
        catalogueRoute('/movie/top_rated', 'movie', 1),
        catalogueRoute('/tv/top_rated', 'tv', 1),
        catalogueRoute('/movie/now_playing', 'movie', 1),
        catalogueRoute('/movie/upcoming', 'movie', 1),
        catalogueRoute('/discover/movie', 'movie', 1, '&with_genres=28&sort_by=popularity.desc'),
        catalogueRoute('/discover/movie', 'movie', 1, '&with_genres=35&sort_by=popularity.desc'),
        catalogueRoute('/discover/movie', 'movie', 1, '&with_genres=16&sort_by=popularity.desc'),
      ]);
    const trendItems = ((trending && trending.results) || [])
      .map((row) => mapItem(row)).filter(Boolean).slice(0, 40);
    const sections = [];
    if (trendItems.length) {
      sections.push({ id: 'trending', title: 'Trending', style: 'hero', items: trendItems.slice(0, 8), viewAll: { mode: 'feed', feedId: 'trending' } });
    }
    const push = (id, title, result, feedId) => {
      const items = (result && result.items) || [];
      if (!items.length) return;
      sections.push({ id, title, style: 'poster', items: items.slice(0, 20), viewAll: { mode: 'feed', feedId } });
    };
    push('movies', 'Popular Movies', movies, 'movies');
    push('tv', 'Popular TV', tv, 'tv');
    push('top-movies', 'Top Rated Movies', topMovies, 'top-rated-movies');
    push('top-tv', 'Top Rated TV', topTv, 'top-rated-tv');
    push('now-playing', 'Now Playing in Cinemas', nowPlaying, 'now-playing');
    push('upcoming', 'Coming Soon', upcoming, 'upcoming');
    push('genre-action', 'Action & Adventure', action, 'genre-movie-28');
    push('genre-comedy', 'Comedy', comedy, 'genre-movie-35');
    push('genre-animation', 'Animation', animation, 'genre-movie-16');
    return { sections };
  }

  const FEED_ROUTES = {
    movies: { route: '/movie/popular', mediaType: 'movie' },
    tv: { route: '/tv/popular', mediaType: 'tv' },
    'top-rated-movies': { route: '/movie/top_rated', mediaType: 'movie' },
    'top-rated-tv': { route: '/tv/top_rated', mediaType: 'tv' },
    'now-playing': { route: '/movie/now_playing', mediaType: 'movie' },
    upcoming: { route: '/movie/upcoming', mediaType: 'movie' },
  };

  async function discoveryFeed(feedId, page) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const id = String(feedId || 'trending').toLowerCase();
    if (FEED_ROUTES[id]) {
      const spec = FEED_ROUTES[id];
      return catalogueRoute(spec.route, spec.mediaType, pageNumber);
    }
    if (id.indexOf('genre') === 0) {
      const genreMatch = id.replace(/^genre[-:]/, '').split(/[-:]/);
      if (genreMatch.length >= 2) {
        const mediaType = genreMatch[0] === 'tv' ? 'tv' : 'movie';
        const genreId = String(Number(genreMatch[1]) || 28);
        return catalogueRoute(
          '/discover/' + mediaType,
          mediaType,
          pageNumber,
          '&with_genres=' + genreId + '&sort_by=popularity.desc',
        );
      }
    }
    const data = await withTimeout(
      requestJson('/trending/all/week?page=' + pageNumber),
      8000,
      null,
    ).catch(() => null);
    return {
      items: ((data && data.results) || []).map((row) => mapItem(row)).filter(Boolean),
      page: pageNumber,
      hasMore: pageNumber < Number((data && data.total_pages) || 1),
    };
  }

  async function extractDetails(value) {
    const parsed = parseHref(value);
    if (!parsed) return { title: 'Unknown title', description: 'Unable to resolve this title.' };
    const key = parsed.type + ':' + parsed.id;
    if (detailsCache[key]) return detailsCache[key];
    const data = await requestJson('/' + parsed.type + '/' + parsed.id + '?append_to_response=credits');
    if (!data) return { title: 'Unknown title', description: 'Metadata is unavailable.' };
    const title = clean(data.title || data.name) || 'Unknown title';
    const image = poster(data.poster_path || data.backdrop_path);
    const seasons = parsed.type === 'tv'
      ? (data.seasons || []).map((row) => {
          const number = Number(row && row.season_number);
          if (!number || number < 1) return 0;
          if (!hasAired(row && row.air_date) && Number(row.episode_count || 0) === 0) return 0;
          return number;
        }).filter((n) => n > 0)
      : [];
    const result = {
      id: href(parsed.type, parsed.id),
      href: href(parsed.type, parsed.id),
      url: href(parsed.type, parsed.id),
      title,
      description: clean(data.overview) || 'No description available.',
      image,
      poster: image,
      banner: poster(data.backdrop_path, 'w1280') || image,
      genres: (data.genres || []).map((row) => row && row.name).filter(Boolean),
      rating: data.vote_average == null ? '' : Number(data.vote_average).toFixed(1),
      year: String(data.release_date || data.first_air_date || '').slice(0, 4),
      type: parsed.type,
      mediaType: parsed.type,
      seasonNumbers: seasons,
      seasons: seasons.length,
      isMovie: parsed.type === 'movie',
      cast: ((data.credits && data.credits.cast) || [])
        .slice(0, 8)
        .map((row) => row && row.name)
        .filter(Boolean),
      runtime:
        data.runtime ||
        (Array.isArray(data.episode_run_time) && data.episode_run_time[0]) ||
        null,
    };
    detailsCache[key] = result;
    if (parsed.type === 'tv' && seasons.length) {
      loadSeasons(parsed.id, seasons, image).catch(() => {});
    }
    return result;
  }

  function mapSeasonEpisodes(tmdbId, season, data, fallbackImage) {
    return ((data && data.episodes) || []).map((row) => {
      const episode = Number(row && row.episode_number);
      if (!episode || !hasAired(row && row.air_date)) return null;
      return {
        number: episode,
        episodeNumber: episode,
        season,
        seasonNumber: season,
        title: 'S' + season + 'E' + episode + ' - ' + (clean(row.name) || 'Episode ' + episode),
        href: href('tv', tmdbId, season, episode),
        image: poster(row.still_path, 'w300') || fallbackImage || '',
        airDate: String((row && row.air_date) || '').slice(0, 10),
        subAvailable: true,
      };
    }).filter(Boolean);
  }

  function collectedEpisodes(tmdbId, seasonNumbers) {
    const episodes = [];
    seasonNumbers.forEach((season) => {
      const rows = seasonCache[tmdbId + ':' + season] || [];
      rows.forEach((row) => episodes.push(row));
    });
    return episodes;
  }

  async function loadSeasons(tmdbId, seasonNumbers, fallbackImage) {
    const missing = seasonNumbers.filter((season) => !seasonCache[tmdbId + ':' + season]);
    if (!missing.length) return collectedEpisodes(tmdbId, seasonNumbers);
    const inflightKey = tmdbId + ':' + missing.join(',');
    if (!seasonInflight[inflightKey]) {
      seasonInflight[inflightKey] = (async () => {
        for (let offset = 0; offset < missing.length; offset += 12) {
          const batch = missing.slice(offset, offset + 12);
          const append = batch.map((season) => 'season/' + season).join(',');
          const data = await requestJson('/tv/' + tmdbId + '?append_to_response=' + append);
          const needFallback = [];
          batch.forEach((season) => {
            const block = data && (data['season/' + season] || data['season_' + season]);
            if (block && Array.isArray(block.episodes)) {
              seasonCache[tmdbId + ':' + season] = mapSeasonEpisodes(
                tmdbId, season, block, fallbackImage,
              );
            } else {
              needFallback.push(season);
            }
          });
          if (needFallback.length) {
            const pages = await Promise.all(needFallback.map((season) =>
              requestJson('/tv/' + tmdbId + '/season/' + season).catch(() => null),
            ));
            needFallback.forEach((season, index) => {
              seasonCache[tmdbId + ':' + season] = mapSeasonEpisodes(
                tmdbId, season, pages[index], fallbackImage,
              );
            });
          }
        }
      })();
    }
    try {
      await seasonInflight[inflightKey];
    } finally {
      delete seasonInflight[inflightKey];
    }
    return collectedEpisodes(tmdbId, seasonNumbers);
  }

  async function extractEpisodes(value) {
    const parsed = parseHref(value);
    if (!parsed) return [];
    const details = await extractDetails(value);
    if (parsed.type === 'movie') {
      return [{
        number: 1,
        episodeNumber: 1,
        season: 1,
        seasonNumber: 1,
        title: details.title,
        href: href('movie', parsed.id),
        image: details.image || '',
        isMovie: true,
        mediaType: 'movie',
        subAvailable: true,
      }];
    }
    const seasons = details.seasonNumbers && details.seasonNumbers.length
      ? details.seasonNumbers : [1];
    const episodes = await loadSeasons(parsed.id, seasons, details.image || '');
    episodes.sort((a, b) => a.season - b.season || a.episodeNumber - b.episodeNumber);
    episodes.forEach((row, index) => { row.number = index + 1; });
    return episodes;
  }

  const LANG_NAMES = {
    en: 'English',
    hi: 'Hindi',
    es: 'Spanish',
    de: 'German',
    pt: 'Portuguese',
    fr: 'French',
    ar: 'Arabic',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Russian',
    zh: 'Chinese',
  };

  function streamLanguage(row) {
    const code = String((row && (row.language || row.lang)) || '').toLowerCase();
    if (LANG_NAMES[code]) return code;
    const blob = [
      row && row.label,
      row && row.quality,
      row && row.audio,
    ].filter(Boolean).join(' ').toLowerCase();
    if (/\bhindi\b/.test(blob)) return 'hi';
    if (/\b(spanish|latino|castellano)\b/.test(blob)) return 'es';
    if (/\b(german|deutsch)\b/.test(blob)) return 'de';
    if (/\b(portuguese|portugues)\b/.test(blob)) return 'pt';
    if (/\b(french|francais)\b/.test(blob)) return 'fr';
    if (/\barabic\b/.test(blob)) return 'ar';
    if (/\bitalian\b/.test(blob)) return 'it';
    if (/\bjapanese\b/.test(blob)) return 'ja';
    if (/\bkorean\b/.test(blob)) return 'ko';
    if (/\benglish\b/.test(blob)) return 'en';
    return '';
  }

  function streamLabel(row) {
    const code = streamLanguage(row);
    const name = LANG_NAMES[code] || String((row && row.label) || '').trim();
    if (code === 'en') return ' English';
    return name || 'Stream';
  }

  function mapSubtitles(rawList) {
    const out = [];
    const seen = Object.create(null);
    const rows = Array.isArray(rawList) ? rawList : [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (!row || typeof row !== 'object') continue;
      const file = String(row.url || row.file || row.src || '').trim();
      if (!file || file.indexOf('http') !== 0) continue;
      if (/\/thumbs?\/|sprite|thumbnail/i.test(file)) continue;
      if (seen[file]) continue;
      const lang = String(row.language || row.lang || row.srclang || '').toLowerCase().trim() || 'und';
      const baseLang = String(lang).split('-')[0];
      seen[file] = true;
      const variant = baseLang !== lang ? ' (' + String(lang).toUpperCase() + ')' : '';
      const label = (LANG_NAMES[baseLang] || row.display || row.label || baseLang || 'Subtitles') + variant
        + (row.hearingImpaired === true ? ' (HI)' : '');
      out.push({
        id: file,
        label: label,
        language: lang,
        lang: lang,
        url: file,
        file: file,
        kind: 'captions',
        headers: subtitleHeaders(file),
        hearingImpaired: row.hearingImpaired === true,
        downloadCount: Number(row.downloadCount) || 0,
      });
    }
    // Group by base language, keep the best N per language (by popularity),
    // sort English first then by language code, cap the total.
    const byLang = Object.create(null);
    for (let i = 0; i < out.length; i += 1) {
      const key = String(out[i].language).split('-')[0] || 'und';
      (byLang[key] = byLang[key] || []).push(out[i]);
    }
    const groups = Object.keys(byLang).map((key) => {
      byLang[key].sort((a, b) => (Number(b.downloadCount) || 0) - (Number(a.downloadCount) || 0));
      return { key: key, rows: byLang[key].slice(0, MAX_SUBS_PER_LANG) };
    });
    groups.sort((a, b) => {
      if (a.key === 'en') return -1;
      if (b.key === 'en') return 1;
      return a.key.localeCompare(b.key);
    });
    const flat = [];
    for (let i = 0; i < groups.length && flat.length < MAX_SUBS_TOTAL; i += 1) {
      for (let j = 0; j < groups[i].rows.length && flat.length < MAX_SUBS_TOTAL; j += 1) {
        flat.push(groups[i].rows[j]);
      }
    }
    return flat;
  }

  function srtToVtt(raw) {
    const text = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!text.trim()) return '';
    if (/^WEBVTT/i.test(text.trim())) return text;
    const lines = text.split('\n');
    const out = ['WEBVTT', ''];
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i];
      if (line.indexOf('-->') >= 0 && /\d\d:\d\d:\d\d,\d+/.test(line)) {
        line = line.replace(/(\d\d:\d\d:\d\d),(\d+)/g, '$1.$2');
      }
      out.push(line);
    }
    return out.join('\n');
  }

  function subtitleHeaders(file) {
    return String(file).indexOf(CINEJOY_SUBS + '/sub/') === 0
      ? { 'User-Agent': USER_AGENT, Accept: 'text/vtt,text/plain,application/x-subrip' }
      : SUBTITLE_HEADERS;
  }

  function cacheSubtitleList(cache, key, value, ttl) {
    const keys = Object.keys(cache);
    if (!cache[key] && keys.length >= MAX_SUBTITLE_LIST_CACHE) {
      keys.sort((a, b) => cache[a].expiresAt - cache[b].expiresAt);
      delete cache[keys[0]];
    }
    cache[key] = { rows: value, expiresAt: Date.now() + ttl };
  }

  async function cinejoySubtitles(id, season, episode, language) {
    const isTv = season != null && episode != null;
    const key = [isTv ? 'tv' : 'movie', id, season || 0, episode || 0].join(':');
    let rows;
    const cached = cinejoyCache[key];
    if (cached && cached.expiresAt > Date.now()) rows = cached.rows;
    else {
      if (!cinejoyInflight[key]) {
        cinejoyInflight[key] = (async () => {
          try {
            let url = CINEJOY_SUBS + '/subtitles?type=' + (isTv ? 'tv' : 'movie') + '&tmdb=' + encodeURIComponent(id);
            if (isTv) url += '&season=' + encodeURIComponent(season) + '&episode=' + encodeURIComponent(episode);
            const response = await withTimeout(fetchv2(url, { Accept: 'application/json' }, 'GET', null), 4000, null);
            if (!response || Number(response.status) !== 200) return [];
            const body = await readBody(response);
            if (body.length > 2000000) return [];
            const parsed = JSON.parse(body);
            if (!Array.isArray(parsed.subtitles)) return [];
            const found = parsed.subtitles.filter(row => row && /^https:\/\/subtitles\.shegu\.st\/sub\/[A-Za-z0-9_-]+$/.test(row.url || ''));
            cacheSubtitleList(cinejoyCache, key, found, found.length ? SUBTITLE_LIST_TTL_MS : 60000);
            return found;
          } catch (_) { return []; }
        })();
      }
      try { rows = await cinejoyInflight[key]; } finally { delete cinejoyInflight[key]; }
    }
    const candidates = rows.filter(row => String(row.language || '').toLowerCase().split('-')[0] === language).slice(0,2);
    for (const row of candidates) {
      // A list entry is not a usable caption. Validate the selected file before
      // suppressing the paid fallback; do not download every offered language.
      const text = await fetchSubtitleText(row.url);
      if (text && !hasEnglishScriptMismatch(text, language)) return [row];
    }
    return [];
  }

  // This rejects obvious script mismatches, not a proof of spoken language or
  // subtitle synchronization. Ignore timestamps, markup and numeric cue IDs.
  function hasEnglishScriptMismatch(text, language) {
    if (String(language).toLowerCase().split('-')[0] !== 'en') return false;
    const dialogue = String(text).replace(/<[^>]*>/g, '').replace(/https?:\/\/\S+/g, '');
    const latin = (dialogue.match(/[A-Za-z]/g) || []).length;
    const foreign = (dialogue.match(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff\u0400-\u04ff\u4e00-\u9fff\u3040-\u30ff]/g) || []).length;
    return foreign >= 20 && foreign > latin;
  }

  async function fetchSubtitleText(url) {
    const file = String(url || '').trim();
    if (!file || file.indexOf('http') !== 0) return '';
    const cached = subtitleTextCache[file];
    if (cached && cached.expiresAt > Date.now()) return cached.body;
    if (subtitleTextInflight[file]) return subtitleTextInflight[file];
    const job = (async function () {
      try {
        const request = typeof fetchv2 === 'function'
          ? fetchv2(file, subtitleHeaders(file), 'GET', null)
          : typeof fetch === 'function'
            ? fetch(file, { headers: subtitleHeaders(file) })
            : null;
        if (!request) return '';
        const response = await withTimeout(request, 5000, null);
        if (!response || (response.status && (response.status < 200 || response.status >= 300))) return '';
        const body = await readBody(response);
        if (!body || body.length > 400000 || /<html|just a moment|captcha/i.test(body.slice(0, 400))) return '';
        if (!/\d{2}:\d{2}[,.]\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}[,.]\d{3}/.test(body)) return '';
        return body;
      } catch (_) {
        return '';
      }
    })().then(function (body) {
      if (body) {
        const keys = Object.keys(subtitleTextCache);
        if (keys.length >= MAX_SUBTITLE_TEXT_CACHE) {
          let oldest = keys[0];
          for (let i = 1; i < keys.length; i += 1) {
            if (subtitleTextCache[keys[i]].expiresAt < subtitleTextCache[oldest].expiresAt) oldest = keys[i];
          }
          delete subtitleTextCache[oldest];
        }
        subtitleTextCache[file] = { body: body, expiresAt: Date.now() + SUBTITLE_TEXT_TTL_MS };
      }
      return body;
    });
    subtitleTextInflight[file] = job;
    return job.then(function (body) {
      delete subtitleTextInflight[file];
      return body;
    }, function () {
      delete subtitleTextInflight[file];
      return '';
    });
  }

  async function hydrateSubtitleContent(subs) {
    const rows = Array.isArray(subs) ? subs : [];
    if (!rows.length) return [];
    // Embed only the first English track. Other tracks keep their URL and are
    // fetched on demand by the player, preventing large response payloads and
    // several subtitle downloads from delaying stream startup.
    const preferredIndexes = [];
    for (let i = 0; i < rows.length; i += 1) {
      const language = String(rows[i] && (rows[i].language || rows[i].lang) || '')
        .toLowerCase().split('-')[0];
      if (language === 'en') preferredIndexes.push(i);
    }
    if (!preferredIndexes.length) preferredIndexes.push(0);
    const hydrateIndexes = preferredIndexes.slice(0, MAX_HYDRATED_SUBS);
    const bodies = await Promise.all(hydrateIndexes.map(function (index) {
      return fetchSubtitleText(rows[index] && rows[index].url);
    }));
    const bodyByIndex = Object.create(null);
    hydrateIndexes.forEach(function (index, bodyIndex) {
      bodyByIndex[index] = bodies[bodyIndex] || '';
    });
    return rows.map(function (row, index) {
      if (!Object.prototype.hasOwnProperty.call(bodyByIndex, index)) return row;
      if (hasEnglishScriptMismatch(bodyByIndex[index], row.language || row.lang)) return null;
      const vtt = srtToVtt(bodyByIndex[index]);
      if (!vtt) return null;
      const copy = {};
      const keys = Object.keys(row);
      for (let i = 0; i < keys.length; i += 1) copy[keys[i]] = row[keys[i]];
      copy.content = vtt;
      copy.data = vtt;
      return copy;
    }).filter(Boolean);
  }

  async function withEnglishSubs(stream, extra) {
    if (!stream) return stream;
    const incoming = Array.isArray(stream.subtitles) ? stream.subtitles : [];
    const mapped = mapSubtitles((Array.isArray(extra) ? extra : []).concat(incoming));
    stream.subtitles = await hydrateSubtitleContent(mapped);
    return stream;
  }

  function availablePrimarySubtitles(id, season, episode) {
    const key = [season != null && episode != null ? 'tv' : 'movie', id, season || 0, episode || 0].join(':');
    const cached = cinejoyCache[key];
    if (!cached || cached.expiresAt <= Date.now()) return [];
    // English must go through file validation; other advertised languages are
    // URL-backed tracks loaded by the player only when selected.
    return cached.rows.filter(row => {
      const lang = String(row.language || '').toLowerCase().split('-')[0];
      return /^[a-z]{2,3}$/.test(lang) && lang !== 'en' && lang !== 'und';
    });
  }

  async function fetchSubsForLanguage(tmdbId, season, episode, lang) {
    const id = String(tmdbId || '').trim();
    if (!id) return [];
    if (CINEJOY_FIRST) {
      const primary = await cinejoySubtitles(id, season, episode, String(lang || 'en').toLowerCase().split('-')[0]);
      if (primary.length) return primary;
    }
    try {
      let path = SUBS_API + '?id=' + encodeURIComponent(id)
        + '&language=' + encodeURIComponent(String(lang || 'en'))
        + '&format=srt';
      if (season != null && Number(season) > 0) {
        path += '&season=' + encodeURIComponent(Number(season));
      }
      if (episode != null && Number(episode) > 0) {
        path += '&episode=' + encodeURIComponent(Number(episode));
      }
      const headers = {
        Accept: 'application/json,*/*',
        'User-Agent': USER_AGENT,
      };
      const request = typeof fetchv2 === 'function'
        ? fetchv2(path, headers, 'GET', null)
        : typeof fetch === 'function'
          ? fetch(path, { headers })
          : null;
      if (!request) return [];
      const response = await withTimeout(request, 5000, null);
      if (!response) return [];
      const body = await readBody(response);
      if (!body) return [];
      let data = null;
      try {
        data = JSON.parse(body);
      } catch (_) {
        return [];
      }
      if (!data || data.ok === false) return [];
      return data.subtitles || [];
    } catch (_) {
      return [];
    }
  }

  async function fetchEnglishSubs(tmdbId, season, episode) {
    const id = String(tmdbId || '').trim();
    if (!id) return [];
    const key = id + ':' + String(season || 0) + ':' + String(episode || 0) + ':en';
    const cached = subtitleListCache[key];
    if (cached && cached.expiresAt > Date.now()) return cached.rows.slice();
    if (subtitleListInflight[key]) return subtitleListInflight[key];
    const job = fetchSubsForLanguage(id, season, episode, 'en')
      .then(function (rows) {
        const mapped = mapSubtitles(rows);
        cacheSubtitleList(subtitleListCache, key, mapped, mapped.length ? SUBTITLE_LIST_TTL_MS : 60000);
        return mapped.slice();
      })
      .catch(function () { return []; });
    subtitleListInflight[key] = job;
    return job.then(function (rows) {
      delete subtitleListInflight[key];
      return rows;
    }, function () {
      delete subtitleListInflight[key];
      return [];
    });
  }

  async function fetchLazySubtitles(tmdbId, season, episode, language) {
    const code = String(language || 'en').toLowerCase().split('-')[0];
    if (!Object.prototype.hasOwnProperty.call(LANG_NAMES, code)) return [];
    const key = String(tmdbId || '') + ':' + String(season || 0) + ':' +
      String(episode || 0) + ':' + code;
    const cached = subtitleListCache[key];
    if (cached && cached.expiresAt > Date.now()) return cached.rows.slice();
    if (subtitleListInflight[key]) return subtitleListInflight[key];
    const job = fetchSubsForLanguage(tmdbId, season, episode, code)
      .then(function (rows) {
        const mapped = mapSubtitles(rows);
        cacheSubtitleList(subtitleListCache, key, mapped, mapped.length ? SUBTITLE_LIST_TTL_MS : 60000);
        return mapped.slice(0, MAX_SUBS_TOTAL);
      })
      .catch(function () { return []; });
    subtitleListInflight[key] = job;
    return job.then(function (rows) {
      delete subtitleListInflight[key];
      return rows;
    }, function () {
      delete subtitleListInflight[key];
      return [];
    });
  }

  function compactMediaStreams(rawList) {
    const rows = [];
    const seen = Object.create(null);
    const source = Array.isArray(rawList) ? rawList : [];
    for (let i = 0; i < source.length; i += 1) {
      const row = source[i];
      const url = String(row && row.url || '').trim();
      if (!row || !url || url.indexOf('http') !== 0 || seen[url]) continue;
      seen[url] = true;
      rows.push(row);
    }
    rows.sort(function (a, b) {
      const aEn = streamLanguage(a) === 'en' ? 0 : 1;
      const bEn = streamLanguage(b) === 'en' ? 0 : 1;
      return aEn - bEn || (Number(b.height) || 0) - (Number(a.height) || 0);
    });
    return rows.slice(0, MAX_MEDIA_STREAMS);
  }

  function packBackendStream(resolved) {
    const incoming = Array.isArray(resolved && resolved.streams) ? resolved.streams : [];
    const candidates = incoming.slice();
    if (resolved && resolved.url) candidates.unshift({
      url: resolved.url,
      headers: resolved.headers || {},
      type: resolved.type || 'hls',
      language: resolved.audioLanguage || resolved.language || '',
    });
    const rows = compactMediaStreams(candidates).filter(row => streamLanguage(row) === 'en');
    if (!rows.length) return null;
    const preferred = rows.find((row) => streamLanguage(row) === 'en') || rows[0];
    return {
      url: preferred.url,
      streams: rows.map((row) => ({
        url: row.url,
        headers: row.headers || resolved.headers || {},
        streamType: row.type || row.streamType || resolved.type || 'hls',
        label: streamLabel(row),
        language: streamLanguage(row),
      })),
      headers: preferred.headers || resolved.headers || {},
      streamType: preferred.type || preferred.streamType || resolved.type || 'hls',
      quality: '1080p',
      lang: 'sub',
      subtitles: mapSubtitles(resolved && resolved.subtitles),
    };
  }

  function decodePageEntities(value) {
    let text = String(value == null ? '' : value);
    for (let i = 0; i < 3; i += 1) {
      const next = text
        .replace(/&quot;/gi, '"')
        .replace(/&#039;|&#x27;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&nbsp;/gi, ' ');
      if (next === text) break;
      text = next;
    }
    return text;
  }

  function suSlug(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'title';
  }

  async function requestPageText(url, extraHeaders) {
    const headers = {
      'User-Agent': SU_UA,
      Accept: SU_PAGE_ACCEPT,
      Referer: STREAMINGUNITY_BASE + '/',
    };
    const extras = extraHeaders || {};
    Object.keys(extras).forEach((key) => { headers[key] = extras[key]; });
    let response = null;
    if (typeof fetchv2 === 'function') response = await fetchv2(url, headers, 'GET', null);
    else if (typeof fetch === 'function') response = await fetch(url, { method: 'GET', headers });
    const status = Number(response && response.status) || 0;
    const text = await readBody(response);
    return { ok: status >= 200 && status < 400, status, text: text || '' };
  }

  function parseInertiaPage(html) {
    const source = String(html || '');
    const match = source.match(/\bdata-page\s*=\s*"([^"]*)"/i) ||
      source.match(/\bdata-page\s*=\s*'([^']*)'/i);
    if (!match || !match[1]) return null;
    try { return JSON.parse(decodePageEntities(match[1])); } catch (_) { return null; }
  }

  function suTitleRecords(page) {
    const props = page && page.props && typeof page.props === 'object' ? page.props : page || {};
    if (Array.isArray(props.titles)) return props.titles;
    if (Array.isArray(props.results)) return props.results;
    if (props.title && typeof props.title === 'object') return [props.title];
    return [];
  }

  function extractVixEmbedUrl(html) {
    const source = String(html || '').replace(/\\\//g, '/');
    const matches = source.match(/<iframe[^>]+src=["']([^"']+)["']/ig) || [];
    for (let i = 0; i < matches.length; i += 1) {
      const match = matches[i].match(/src=["']([^"']+)["']/i);
      const candidate = decodePageEntities(clean(match && match[1]));
      if (/vixcloud\.co\//i.test(candidate)) {
        if (/^https?:\/\//i.test(candidate)) return candidate;
        if (candidate.indexOf('//') === 0) return 'https:' + candidate;
      }
    }
    const direct = source.match(/https?:\/\/vixcloud\.co\/(?:embed|e)\/[^"'<>\s]+/i);
    return direct ? decodePageEntities(clean(direct[0])) : '';
  }

  function unescapeJs(value) {
    return String(value || '')
      .replace(/\\u0026/gi, '&')
      .replace(/\\\//g, '/')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }

  function vixConfig(html) {
    const source = String(html || '');
    let streams = [];
    const streamMatch = source.match(/window\.streams\s*=\s*(\[[\s\S]*?\])\s*;/i);
    if (streamMatch) {
      try {
        const parsed = JSON.parse(unescapeJs(streamMatch[1]));
        if (Array.isArray(parsed)) streams = parsed;
      } catch (_) {}
    }
    streams.sort((a, b) => {
      const activeA = a && (a.active === true || a.active === 1) ? 1 : 0;
      const activeB = b && (b.active === true || b.active === 1) ? 1 : 0;
      return activeB - activeA;
    });
    const tokenMatch = source.match(/["']token["']\s*:\s*["']([^"']+)["']/i);
    const expiresMatch = source.match(/["']expires["']\s*:\s*["']([^"']+)["']/i);
    const asnMatch = source.match(/["']asn["']\s*:\s*["']([^"']*)["']/i);
    const masterMatch = source.match(/window\.masterPlaylist\s*=\s*\{[\s\S]*?\burl\s*:\s*["']([^"']+)["']/i);
    const videoMatch = source.match(/window\.video\s*=\s*\{[\s\S]*?\bid\s*:\s*["']([^"']+)["']/i);
    const bases = [];
    streams.forEach((stream) => {
      const value = unescapeJs(stream && stream.url);
      if (value && value.indexOf('/playlist/') >= 0) bases.push(value);
    });
    if (masterMatch && masterMatch[1]) bases.push(unescapeJs(masterMatch[1]));
    return {
      streams: bases,
      token: tokenMatch ? tokenMatch[1] : '',
      expires: expiresMatch ? expiresMatch[1] : '',
      asn: asnMatch ? asnMatch[1] : '',
      mediaId: videoMatch ? videoMatch[1] : '',
      canPlayFhd: /window\.canPlayFHD\s*=\s*true/i.test(source),
    };
  }

  function appendQuery(url, key, value) {
    const result = String(url || '');
    if (!value || new RegExp('(?:[?&])' + key + '=', 'i').test(result)) return result;
    return result + (result.indexOf('?') >= 0 ? '&' : '?') + key + '=' + encodeURIComponent(String(value));
  }

  function buildVixPlaylistUrl(base, config) {
    let url = clean(base).replace(/&amp;/g, '&');
    url = appendQuery(url, 'token', config.token);
    url = appendQuery(url, 'expires', config.expires);
    url = appendQuery(url, 'asn', config.asn);
    if (config.canPlayFhd) url = appendQuery(url, 'h', '1');
    url = appendQuery(url, 'lang', 'en');
    return url;
  }

  function vixHeaders() {
    return {
      'User-Agent': SU_UA,
      Accept: SU_HLS_ACCEPT,
      Referer: VIX_BASE + '/',
      Origin: VIX_BASE,
    };
  }

  async function loadSuTitle(id, slug) {
    const candidates = [];
    if (id && slug) candidates.push(STREAMINGUNITY_BASE + '/en/titles/' + id + '-' + slug);
    if (id) candidates.push(STREAMINGUNITY_BASE + '/en/titles/' + id);
    for (let i = 0; i < candidates.length; i += 1) {
      const pageRes = await requestPageText(candidates[i]);
      if (!pageRes.ok) continue;
      const page = parseInertiaPage(pageRes.text);
      const title = page && page.props && page.props.title;
      if (title && title.id) return title;
    }
    return null;
  }

  async function findStreamingUnityTitle(parsed) {
    const path = parsed.type === 'tv' ? '/tv/' + parsed.id : '/movie/' + parsed.id;
    const meta = await withTimeout(requestJson(path), 8000, null).catch(() => null);
    const name = clean(meta && (meta.title || meta.name || meta.original_title || meta.original_name));
    if (!name) return null;
    const searchRes = await requestPageText(
      STREAMINGUNITY_BASE + '/en/search?q=' + encodeURIComponent(name),
    );
    if (!searchRes.ok) return null;
    const page = parseInertiaPage(searchRes.text);
    const records = suTitleRecords(page);
    const wantedType = parsed.type === 'tv' ? 'tv' : 'movie';
    const wantedName = name.toLowerCase();
    const ranked = records.slice().sort((a, b) => {
      const aName = clean(a && (a.name || a.title)).toLowerCase() === wantedName ? 0 : 1;
      const bName = clean(b && (b.name || b.title)).toLowerCase() === wantedName ? 0 : 1;
      const aType = String(a && a.type || '').toLowerCase() === wantedType ? 0 : 1;
      const bType = String(b && b.type || '').toLowerCase() === wantedType ? 0 : 1;
      return aName - bName || aType - bType;
    });
    let namedFallback = null;
    for (let i = 0; i < Math.min(ranked.length, 6); i += 1) {
      const row = ranked[i];
      const id = String(row && row.id || '');
      if (!id) continue;
      if (String(row.type || '').toLowerCase() !== wantedType &&
          clean(row.name || row.title).toLowerCase() !== wantedName) {
        continue;
      }
      const title = await loadSuTitle(id, suSlug(row.slug || row.name || row.title));
      if (!title) continue;
      if (String(title.tmdb_id || '') === String(parsed.id)) return title;
      if (!namedFallback &&
          !title.tmdb_id &&
          clean(title.name || title.title).toLowerCase() === wantedName &&
          String(title.type || '').toLowerCase() === wantedType) {
        namedFallback = title;
      }
    }
    // Do not cross-match remakes or similarly named series without TMDB proof.
    return null;
  }

  async function streamingUnityEpisodeId(title, season, episode) {
    const slug = suSlug(title.slug || title.name);
    const href = STREAMINGUNITY_BASE + '/en/titles/' + title.id + '-' + slug + '/season-' + Number(season);
    const pageRes = await requestPageText(href);
    if (!pageRes.ok) return '';
    const page = parseInertiaPage(pageRes.text);
    const loaded = page && page.props && page.props.loadedSeason;
    const rows = loaded && Array.isArray(loaded.episodes) ? loaded.episodes : [];
    const hit = rows.find((row) => Number(row && row.number) === Number(episode));
    return hit && hit.id ? String(hit.id) : '';
  }

  async function resolveStreamingUnityPlaylist(embedUrl, iframeUrl) {
    const embedRes = await requestPageText(embedUrl, {
      Referer: iframeUrl || STREAMINGUNITY_BASE + '/',
    });
    if (!embedRes.ok || !embedRes.text) return null;
    const config = vixConfig(embedRes.text);
    const bases = config.streams.slice();
    if (config.mediaId && !bases.length) {
      bases.push(VIX_BASE + '/playlist/' + config.mediaId + '?b=1');
    }
    const headers = vixHeaders();
    const seen = Object.create(null);
    for (let i = 0; i < bases.length; i += 1) {
      const playlistUrl = buildVixPlaylistUrl(bases[i], config);
      if (!playlistUrl || seen[playlistUrl]) continue;
      seen[playlistUrl] = true;
      const playlistRes = await requestPageText(playlistUrl, headers);
      if (!playlistRes.ok || String(playlistRes.text || '').indexOf('#EXTM3U') < 0) continue;
      if (playlistRes.text.indexOf('#EXT-X-STREAM-INF') >= 0) {
        const lines = playlistRes.text.split(/\r?\n/);
        let bestVariantUrl = '';
        const variants = [];
        for (let j = 0; j < lines.length; j += 1) {
          if (lines[j].indexOf('#EXT-X-STREAM-INF') === 0) {
            const nextLine = lines[j + 1] ? lines[j + 1].trim() : '';
            if (nextLine && !nextLine.startsWith('#')) {
              const varUrl = nextLine.startsWith('http') ? nextLine : new URL(nextLine, playlistUrl).toString();
              const resMatch = lines[j].match(/RESOLUTION=(\d+x\d+)/i);
              const qLabel = resMatch ? resMatch[1].split('x')[1] + 'p' : 'Auto';
              variants.push({ quality: qLabel, url: varUrl, label: 'English · Stream Unity (' + qLabel + ')', headers, streamType: 'hls', language: 'en', provider: 'streamingunity' });
              if (!bestVariantUrl) bestVariantUrl = varUrl;
            }
          }
        }
        return {
          url: bestVariantUrl || playlistUrl,
          headers,
          streamType: 'hls',
          language: 'en',
          label: 'English · Stream Unity',
          provider: 'streamingunity',
          streams: variants.length ? variants : [{ url: playlistUrl, headers, streamType: 'hls', label: 'English · Stream Unity', language: 'en', provider: 'streamingunity' }],
        };
      }
      return {
        url: playlistUrl,
        headers,
        streamType: 'hls',
        language: 'en',
        label: 'English · Stream Unity',
        provider: 'streamingunity',
      };
    }
    return null;
  }

  async function resolveStreamingUnity(parsed) {
    const title = await findStreamingUnityTitle(parsed);
    if (!title || !title.id) return null;
    const slug = suSlug(title.slug || title.name);
    const hasDub = title.dub_ita === true || title.dub_ita === 1 || title.dub_ita === '1' ? '1' : '0';
    let reference = '/streamingunity/movie/' + title.id + '/' + (title.scws_id || 0) + '/' + hasDub + '/' + slug;
    if (parsed.type === 'tv') {
      const episodeId = await streamingUnityEpisodeId(title, parsed.season || 1, parsed.episode || 1);
      if (!episodeId) return null;
      reference = '/streamingunity/episode/' + title.id + '/' + (parsed.season || 1) + '/' + episodeId + '/0/' + hasDub + '/' + slug;
    }
    // StreamUnity's sub means English; never call its Italian dub route.
    const resolved = await unity.extractStreamUrl(reference, 'sub');
    if (!resolved || !resolved.url || resolved.audioLanguage !== 'en') return null;
    return resolved;
  }

  async function legacyResolveStreamingUnityUnused(parsed) {
    const title = await findStreamingUnityTitle(parsed);
    if (!title || !title.id) return null;
    let iframeUrl = STREAMINGUNITY_BASE + '/en/iframe/' + encodeURIComponent(String(title.id));
    if (parsed.type === 'tv') {
      const episodeId = await streamingUnityEpisodeId(
        title,
        parsed.season || 1,
        parsed.episode || 1,
      );
      if (!episodeId) return null;
      iframeUrl += '?episode_id=' + encodeURIComponent(episodeId) + '&next_episode=1';
    }
    const iframeRes = await requestPageText(iframeUrl, {
      Referer: STREAMINGUNITY_BASE + '/en/watch/' + encodeURIComponent(String(title.id)),
    });
    if (!iframeRes.ok) return null;
    const embedUrl = extractVixEmbedUrl(iframeRes.text);
    if (!embedUrl) return null;
    const playlist = await resolveStreamingUnityPlaylist(embedUrl, iframeUrl);
    if (!playlist || !playlist.url) return null;
    return {
      url: playlist.url,
      streams: [{
        url: playlist.url,
        headers: playlist.headers,
        streamType: 'hls',
        label: playlist.label,
        language: 'en',
        provider: 'streamingunity',
      }],
      headers: playlist.headers,
      streamType: 'hls',
      quality: 'Auto',
      lang: 'sub',
      subtitles: [],
    };
  }

  async function postBackend(url, parsed, lang) {
    const response = await withTimeout(
      Promise.resolve().then(function () {
        return fetchv2(
          url,
          { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
          'POST',
          JSON.stringify({
            type: parsed.type,
            tmdbId: parsed.id,
            season: parsed.season || 1,
            episode: parsed.episode || 1,
            lang: String(lang || 'sub'),
          }),
        );
      }),
      12000,
      null,
    );
    if (!response) return null;
    const body = await readBody(response);
    if (!body) return null;
    try { return JSON.parse(body); } catch (_) { return null; }
  }

  async function resolveFromLocalBackend(parsed, lang) {
    if (typeof fetchv2 !== 'function') return { reached: false };
    return await new Promise((done) => {
      let pending = MOVIES_BACKENDS.length;
      let finished = false;
      let lastError = '';
      MOVIES_BACKENDS.forEach((url) => {
        postBackend(url, parsed, lang).then((data) => {
          if (finished) return;
          if (data && data.ok && data.url) {
            const stream = packBackendStream(data);
            if (stream) {
              finished = true;
              done({ reached: true, stream: stream });
              return;
            }
          }
          if (data && data.error) lastError = String(data.error);
          pending -= 1;
          if (pending <= 0) done({ reached: false, error: lastError });
        }).catch(() => {
          if (finished) return;
          pending -= 1;
          if (pending <= 0) done({ reached: false, error: lastError });
        });
      });
    });
  }

  async function attachSubtitles(stream, tmdbId, season, episode, requestedLang) {
    if (!stream) return stream;
    // Keep lookup best-effort; the existing lazy action can retry a slow source.
    const extra = await withTimeout(
      fetchEnglishSubs(tmdbId, season, episode),
      4000,
      [],
    );
    const available = extra.concat(availablePrimarySubtitles(tmdbId, season, episode));
    const result = await withEnglishSubs(stream, available);
    // The runtime prefers a selected server's tracks over top-level tracks.
    // Preserve the validated inline captions and each server's own tracks.
    if (Array.isArray(result.servers)) {
      result.servers = result.servers.map(server => {
        const tracks = mapSubtitles(available.concat(server.subtitles || []));
        return Object.assign({}, server, { subtitles: tracks.map(track => {
          const hydrated = result.subtitles.find(row => row.url === track.url && row.content);
          return hydrated || track;
        }) });
      });
    }
    result.subtitleLanguages = result.subtitles.map(row => ({ code: row.language, label: row.label }));
    return result;
  }

  async function extractSubtitles(episodeId, language) {
    const parsed = parseHref(episodeId);
    if (!parsed) return { subtitles: [], error: { message: 'Invalid episode.' } };
    const rows = await fetchLazySubtitles(
      parsed.id,
      parsed.type === 'tv' ? (parsed.season || 1) : null,
      parsed.type === 'tv' ? (parsed.episode || 1) : null,
      language,
    );
    return { subtitles: await hydrateSubtitleContent(rows) };
  }

  async function extractStreamUrl(episodeId, lang) {
    const parsed = parseHref(episodeId);
    if (!parsed) return { streams: [], subtitles: [], error: { message: 'Invalid episode.' } };
    const tvSeason = parsed.type === 'tv' ? (parsed.season || 1) : null;
    const tvEpisode = parsed.type === 'tv' ? (parsed.episode || 1) : null;
    let backendError = '';
    try {
      const unity = await withTimeout(resolveStreamingUnity(parsed), 25000, null);
      if (unity && unity.url) {
        return await attachSubtitles(unity, parsed.id, tvSeason, tvEpisode, lang);
      }
    } catch (_) {}
    try {
      const local = await resolveFromLocalBackend(parsed, lang);
      if (local && local.stream) return await attachSubtitles(local.stream, parsed.id, tvSeason, tvEpisode, lang);
      if (local && local.error) backendError = local.error;
    } catch (_) {}
    if (typeof globalThis.__resolveViaBackend === 'function') {
      try {
        let resolved = await globalThis.__resolveViaBackend(
          'synthetiq-movies-v1',
          'stream',
          JSON.stringify({
            episodeId: String(episodeId),
            type: parsed.type,
            tmdbId: parsed.id,
            season: parsed.season || 1,
            episode: parsed.episode || 1,
            lang: String(lang || 'sub'),
          }),
        );
        if (typeof resolved === 'string') {
          try { resolved = JSON.parse(resolved); } catch (_) {}
        }
        if (resolved && resolved._resolverError === 'service_limit_exceeded') {
          return { streams: [], subtitles: [], error: { message: 'Hourly fallback limit reached. Try again later.' } };
        }
        if (resolved && resolved.url) {
          const packed = packBackendStream(resolved);
          if (packed) return await attachSubtitles(packed, parsed.id, tvSeason, tvEpisode, lang);
        }
        if (resolved && Array.isArray(resolved.streams) && resolved.streams.length) {
          const packed = packBackendStream(resolved);
          if (packed) return await attachSubtitles(packed, parsed.id, tvSeason, tvEpisode, lang);
        }
      } catch (_) {}
    }
    return {
      streams: [],
      subtitles: [],
      error: { message: backendError || 'No verified video source is available right now.' },
    };
  }

  globalThis.searchResults = searchResults;
  globalThis.extractDetails = extractDetails;
  globalThis.extractEpisodes = extractEpisodes;
  globalThis.extractStreamUrl = extractStreamUrl;
  globalThis.extractSubtitles = extractSubtitles;
  globalThis.discoveryHome = discoveryHome;
  globalThis.discoveryFeed = discoveryFeed;
})();

})();
