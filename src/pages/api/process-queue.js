// /pages/api/process-queue.js
import db from "../../lib/database";
import axios from "axios";
import cheerio from "cheerio";

const processQueue = async (req, res) => {
	try {
		// Fetch the oldest URL from the queue
		const [[row]] = await db.execute(
			`SELECT * FROM queued_urls ORDER BY id ASC LIMIT 1`
		);

		if (!row) {
			console.log("Queue is empty. Waiting for new URLs...");
			return res.status(200).json({ message: "Queue is empty" });
		} else {
			const { id, url, sitemap_url } = row;
			console.log(`Processing URL: ${url}`);

			try {
				// Check if the URL is indexed by Google
				const googleSearchUrl = `https://www.google.com/search?q=site:${encodeURIComponent(
					url
				)}`;
				const response = await axios.get(googleSearchUrl, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
				});

				const $ = cheerio.load(response.data);
				const searchResults = $("#search .g");
				const isIndexed = searchResults.length > 0;

				// Fetch the page title
				let title = "No title";
				try {
					const pageResponse = await axios.get(url, {
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
						},
					});
					const $$ = cheerio.load(pageResponse.data);
					title = $$("title").text() || "No title";
				} catch (error) {
					console.error("Error fetching page title:", error.message);
				}

				// Update the sitemaps table
				await db.execute(
					`
            INSERT INTO sitemaps (sitemap_url, page_title, page_url, index_status, last_scan)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
              index_status = VALUES(index_status),
              last_scan = NOW(),
              page_title = VALUES(page_title)
          `,
					[sitemap_url, title, url, isIndexed ? 1 : 0]
				);

				// Remove the processed URL from the queue
				await db.execute(`DELETE FROM queued_urls WHERE id = ?`, [id]);

				console.log(`Processed and removed URL from queue: ${url}`);
				return res
					.status(200)
					.json({ message: `Processed URL: ${url}` });
			} catch (error) {
				console.error("Error processing URL:", error.message);
				return res.status(500).json({ error: error.message });
			}
		}
	} catch (error) {
		console.error("Error processing queue:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

export default processQueue;
