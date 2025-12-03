import fetch from 'node-fetch';

export default async function handler(req, res) {
  const query = req.query.search?.toString().trim().toLowerCase() || '';
  if (!query) return res.status(400).json({ error: 'No search query' });

  try {
    // Use a public CORS proxy to bypass Vercel's outbound block
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const steamListUrl = encodeURIComponent('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    
    const listResp = await fetch(proxyUrl + steamListUrl);
    const listData = await listResp.json();
    const content = JSON.parse(listData.contents);
    const apps = content.applist.apps || [];

    const matches = apps
      .filter(app => app.name && app.name.toLowerCase().includes(query))
      .slice(0, 5);

    const results = [];
    for (const app of matches) {
      try {
        const reviewResp = await fetch(
          `https://store.steampowered.com/appreviews/${app.appid}?json=1&filter=all&language=all&day_range=9223372036854775807`
        );
        const reviewData = await reviewResp.json();
        const q = reviewData.query_summary || {};

        const total = q.total_reviews || 0;
        const positive = q.total_positive || 0;

        const percentage = total >= 100
          ? Number(((positive / total) * 100).toFixed(1))
          : null;

        results.push({
          appid: app.appid,
          name: app.name,
          score: percentage
        });
      } catch {
        results.push({ appid: app.appid, name: app.name, score: null });
      }
    }

    res.status(200).json(results);
  } catch (e) {
    console.error('Proxy error:', e);
    res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
