import axios from "axios";
import xml2js from "xml2js";

export default async function handler(req, res) {
	const { sitemapUrl } = req.query;

	if (!sitemapUrl) {
		return res.status(400).json({ error: "Sitemap URL is required" });
	}

	try {
		// Fetch the sitemap XML
		const response = await axios.get(sitemapUrl);

		// Parse the XML to JSON
		const parsedSitemap = await xml2js.parseStringPromise(response.data);

		// Extract URLs from the sitemap
		let sitemapUrls = [];
		if (parsedSitemap.urlset && parsedSitemap.urlset.url) {
			sitemapUrls = parsedSitemap.urlset.url.map(
				(urlObj) => urlObj.loc[0]
			);
		} else if (
			parsedSitemap.sitemapindex &&
			parsedSitemap.sitemapindex.sitemap
		) {
			// Handle sitemap index (nested sitemaps)
			sitemapUrls = parsedSitemap.sitemapindex.sitemap.map(
				(sitemapObj) => sitemapObj.loc[0]
			);
		}

		// Send the extracted URLs as the response
		res.status(200).json({ sitemapUrls });
	} catch (error) {
		console.error("Error fetching or parsing sitemap:", error);

		if (error.response) {
			// Error with the response from the axios request
			res.status(error.response.status).json({
				error: `Failed to fetch sitemap: ${error.response.statusText}`,
			});
		} else if (error.request) {
			// Error with the request made
			res.status(500).json({
				error: "No response received when fetching the sitemap.",
			});
		} else {
			// General error (parsing, etc.)
			res.status(500).json({ error: "Failed to parse sitemap." });
		}
	}
}
