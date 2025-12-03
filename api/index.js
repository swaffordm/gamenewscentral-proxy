import fetch from 'node-fetch';

export default async function handler(req, res) {
  const query = req.query.search?.toString().toLowerCase() || '';
  
  if (!query) {
    return res.status(400).json({ error: 'No search query' });
  }

  try {
    // Download full Steam list (cached by Vercel for 24h)
    const steamResponse = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    const steamData = await steamResponse.json();
    const apps = steamData.applist.apps;

    // Find matching games (top 5)
    const matches = apps
      .filter(app => app.name?.toLowerCase().includes(query))
      .slice(0, 5);

    // Get review scores for matches
    const results = [];
    for (const app of matches) {
      try {
        const reviewResp = await fetch(
          `https://store.steampowered.com/appreviews/${app.appid}?json=1&language=all&filter=all&day_range=9223372036854775807`
        );
        const reviewData = await reviewResp.json();
        const summary = reviewData.query_summary;
        const percentage = summary && summary.total_reviews > 100
          ? (summary.total_positive / summary.total_reviews) * 100
          : null;

        results.push({
          appid: app.appid,
          name: app.name,
          score: percentage ? Number(percentage.toFixed(1)) : null
        });
      } catch (e) {
        results.push({ appid: app.appid, name: app.name, score: null });
      }
    }

    res.status(200).json(results);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Steam API failed' });
  }
}
