// src/pages/api/queued-urls-count.js
import db from "../../lib/database";

export default async function handler(req, res) {
	const { sitemapUrl } = req.query;

	if (!sitemapUrl) {
		return res.status(400).json({ error: "sitemapUrl is required" });
	}

	try {
		db.get(
			"SELECT COUNT(*) as count FROM queued_urls WHERE sitemap_url = ?",
			[sitemapUrl],
			(err, row) => {
				if (err) {
					return res.status(500).json({ error: err.message });
				}
				const count = row.count;
				if (count === 0) {
					return res.status(200).json({ count, position: null });
				}

				db.get(
					`SELECT COUNT(*) as position FROM queued_urls WHERE id <= (
                        SELECT id FROM queued_urls WHERE sitemap_url = ? ORDER BY id DESC LIMIT 1
                    )`,
					[sitemapUrl],
					(err, row) => {
						if (err) {
							return res.status(500).json({ error: err.message });
						}
						res.status(200).json({ count, position: row.position });
					}
				);
			}
		);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}
