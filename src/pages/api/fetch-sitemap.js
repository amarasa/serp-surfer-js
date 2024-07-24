import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
	const { sitemapUrl } = req.query;

	if (!sitemapUrl) {
		return res.status(400).json({ error: "Sitemap URL is required" });
	}

	try {
		const response = await axios.get(sitemapUrl);
		const parsedSitemap = await xml2js.parseStringPromise(response.data);
		const sitemapUrls = parsedSitemap.urlset.url.map(
			(urlObj) => urlObj.loc[0]
		);

		res.status(200).json({ sitemapUrls });
	} catch (error) {
		console.error("Error fetching or parsing sitemap:", error);
		res.status(500).json({ error: "Failed to fetch or parse sitemap" });
	}
}
