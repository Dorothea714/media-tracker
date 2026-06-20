// Netlify Function — API proxy for Google Books & TMDB
// Routes requests through Netlify's servers to bypass GFW blocks

exports.handler = async (event) => {
  const { type, q, key } = event.queryStringParameters || {};

  if (!type || !q) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing type or q parameter' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  try {
    let url;

    if (type === 'book') {
      // Google Books API (free, no key needed)
      url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8&langRestrict=zh`;
    } else if (type === 'movie') {
      if (!key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'TMDB API key required for movies' }) };
      }
      url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(q)}&language=zh-CN&page=1`;
    } else if (type === 'tv') {
      if (!key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'TMDB API key required for TV series' }) };
      }
      url = `https://api.themoviedb.org/3/search/tv?api_key=${key}&query=${encodeURIComponent(q)}&language=zh-CN&page=1`;
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type. Use: book, movie, or tv' }) };
    }

    console.log(`Proxying ${type} search: "${q}" → ${url}`);

    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.error(`Upstream API error: ${resp.status} ${resp.statusText}`);
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: `Upstream API returned ${resp.status}` }),
      };
    }

    const data = await resp.json();

    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (err) {
    console.error('Proxy error:', err.message);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Proxy request failed: ' + err.message }),
    };
  }
};
