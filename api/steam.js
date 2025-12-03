export default async function handler(req, res) {
  const query = req.query.search?.toString().toLowerCase() || '';
  if (!query) return res.status(400).json({ error: 'No search' });

  try {
    // Get full Steam app list
    const listResp = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    const listData = await listResp.json();
    const apps = listData.applist.apps;

    // Find matches
    const matches = apps
      .filter(app => app.name?.toLowerCase().includes(query))
      .slice(0, 5);

    const results = [];
    for (const app of matches) {
      try {
        const reviewResp = await fetch(
          `https://store.steampowered.com/appreviews/${app.appid}?json=1&filter=all&language=all&day_range=9223372036854775807`
        );
        const reviewData = await reviewResp.json();
        const q = reviewData.query_summary;

        const percentage = q && q.total_reviews > 100
          ? Number(((q.total_positive / q.total_reviews) * 100).toFixed(1))
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
    res.status(500).json({ error: 'Failed' });
  }
}
