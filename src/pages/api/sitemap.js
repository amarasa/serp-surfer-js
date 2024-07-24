import db from "../../lib/database";

export default async function handler(req, res) {
	if (req.method === "POST") {
		const { sitemapUrl, title, pageUrl, indexStatus } = req.body;

		db.run(
			`
      INSERT INTO sitemaps (sitemap_url, page_title, page_url, index_status, last_scan)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(page_url) DO UPDATE SET
        index_status=excluded.index_status,
        last_scan=datetime('now')
    `,
			[sitemapUrl, title, pageUrl, indexStatus ? 1 : 0],
			(err) => {
				if (err) {
					return res
						.status(500)
						.json({ error: "Failed to update database" });
				}
				res.status(200).json({ success: true });
			}
		);
	} else if (req.method === "GET") {
		const { sitemapUrl } = req.query;

		db.all(
			`
      SELECT * FROM sitemaps WHERE sitemap_url = ?
    `,
			[sitemapUrl],
			(err, rows) => {
				if (err) {
					return res
						.status(500)
						.json({ error: "Failed to fetch data" });
				}
				res.status(200).json({ data: rows });
			}
		);
	} else {
		res.status(405).json({ error: "Method not allowed" });
	}
}
