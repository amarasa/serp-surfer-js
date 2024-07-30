import db from "../../lib/database";

export default async function handler(req, res) {
	if (req.method === "POST") {
		const { sitemapUrl, title, pageUrl, indexStatus } = req.body;

		try {
			await db.execute(
				`
        INSERT INTO sitemaps (sitemap_url, page_title, page_url, index_status, last_scan)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          index_status = VALUES(index_status),
          last_scan = NOW(),
          page_title = VALUES(page_title)
        `,
				[sitemapUrl, title, pageUrl, indexStatus ? 1 : 0]
			);
			res.status(200).json({ success: true });
		} catch (err) {
			console.error("Database Error:", err.message);
			res.status(500).json({ error: "Failed to update database" });
		}
	} else if (req.method === "GET") {
		const { sitemapUrl } = req.query;

		try {
			const [rows] = await db.execute(
				`
        SELECT * FROM sitemaps WHERE sitemap_url = ?
        `,
				[sitemapUrl]
			);
			res.status(200).json({ data: rows });
		} catch (err) {
			console.error("Database Error:", err.message);
			res.status(500).json({ error: "Failed to fetch data" });
		}
	} else {
		res.status(405).json({ error: "Method not allowed" });
	}
}
