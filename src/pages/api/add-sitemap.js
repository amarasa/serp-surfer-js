import axios from "axios";
import { parseStringPromise } from "xml2js";
import db from "../../lib/database";

export default async function handler(req, res) {
	if (req.method === "POST") {
		const { sitemapUrl } = req.body;

		try {
			// Fetch and parse the sitemap
			const response = await axios.get(sitemapUrl);
			const sitemap = await parseStringPromise(response.data);

			// Extract URLs from the sitemap
			const urls = sitemap.urlset.url.map((entry) => entry.loc[0]);

			let totalUrls = urls.length;
			let processedUrls = 0;

			for (const url of urls) {
				// Check if URL exists in sitemaps.db
				const sitemapExists = await new Promise((resolve, reject) => {
					db.get(
						`SELECT * FROM sitemaps WHERE sitemap_url = ? AND page_url = ?`,
						[sitemapUrl, url],
						(err, row) => {
							if (err) {
								reject(err);
							} else {
								resolve(row);
							}
						}
					);
				});

				if (sitemapExists) {
					processedUrls++;
				} else {
					// Check if URL exists in queued_urls table
					const queueExists = await new Promise((resolve, reject) => {
						db.get(
							`SELECT * FROM queued_urls WHERE sitemap_url = ? AND url = ?`,
							[sitemapUrl, url],
							(err, row) => {
								if (err) {
									reject(err);
								} else {
									resolve(row);
								}
							}
						);
					});

					if (!queueExists) {
						// Add URL to queued_urls table
						await new Promise((resolve, reject) => {
							db.run(
								`INSERT INTO queued_urls (sitemap_url, url) VALUES (?, ?)`,
								[sitemapUrl, url],
								(err) => {
									if (err) {
										reject(err);
									} else {
										resolve();
									}
								}
							);
						});
					}
				}
			}

			res.status(200).json({
				message: "Sitemap URLs have been queued successfully.",
				processedUrls,
				totalUrls,
			});
		} catch (error) {
			console.error("Error processing sitemap:", error);
			res.status(500).json({ error: "Error processing sitemap." });
		}
	} else {
		res.status(405).json({ error: "Method not allowed." });
	}
}
