// src/pages/api/queued-urls.js
import db from "../../lib/database";

export default async function handler(req, res) {
	const { sitemapUrl } = req.query;

	if (!sitemapUrl) {
		return res.status(400).json({ error: "sitemapUrl is required" });
	}

	try {
		db.all(
			"SELECT * FROM sitemaps WHERE sitemap_url = ?",
			[sitemapUrl],
			(err, rows) => {
				if (err) {
					return res.status(500).json({ error: err.message });
				}
				res.status(200).json({ data: rows });
			}
		);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}
