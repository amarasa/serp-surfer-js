const db = require("../../lib/database");

export default async function handler(req, res) {
	const { sitemapUrl } = req.query;

	if (!sitemapUrl) {
		return res.status(400).json({ error: "sitemapUrl is required" });
	}

	try {
		const [rows] = await db.execute(
			"SELECT * FROM sitemaps WHERE sitemap_url = ?",
			[sitemapUrl]
		);
		res.status(200).json({ data: rows });
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ error: err.message });
	}
}
