const db = require("../../lib/database");

export default async function handler(req, res) {
	const { sitemapUrl } = req.query;

	if (!sitemapUrl) {
		return res.status(400).json({ error: "sitemapUrl is required" });
	}

	try {
		const [[countRow]] = await db.execute(
			"SELECT COUNT(*) as count FROM queued_urls WHERE sitemap_url = ?",
			[sitemapUrl]
		);
		const count = countRow.count;

		if (count === 0) {
			return res.status(200).json({ count, position: null });
		}

		const [[positionRow]] = await db.execute(
			`SELECT COUNT(*) as position FROM queued_urls WHERE id <= (
        SELECT id FROM queued_urls WHERE sitemap_url = ? ORDER BY id DESC LIMIT 1
      )`,
			[sitemapUrl]
		);

		res.status(200).json({ count, position: positionRow.position });
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: err.message });
	}
}
