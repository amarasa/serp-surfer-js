import axios from "axios";
import cheerio from "cheerio";
import db from "../../lib/database";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
	const { url, sitemapUrl } = req.query;

	if (!url || !sitemapUrl) {
		return res
			.status(400)
			.json({ error: "URL and Sitemap URL are required" });
	}

	let delayMs = 10000; // Initial delay of 10 seconds
	let attempt = 0;
	const maxAttempts = 5;

	while (attempt < maxAttempts) {
		try {
			const googleSearchUrl = `https://www.google.com/search?q=site:${encodeURIComponent(
				url
			)}`;
			console.log("Google Search URL:", googleSearchUrl);

			const response = await axios.get(googleSearchUrl, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				},
			});

			console.log("Google Response Status:", response.status);
			const $ = cheerio.load(response.data);
			const searchResults = $("#search .g");
			const isIndexed = searchResults.length > 0;

			let title = "No title";
			if (isIndexed) {
				const pageResponse = await axios.get(url, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
					},
				});
				const $$ = cheerio.load(pageResponse.data);
				title = $$("title").text();
			}

			await delay(delayMs); // Increase delay to 3 seconds between requests

			// Update the database
			const query = `
        INSERT INTO sitemaps (sitemap_url, page_title, page_url, index_status, last_scan)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          index_status = VALUES(index_status),
          last_scan = NOW(),
          page_title = VALUES(page_title)
      `;

			await db.execute(query, [
				sitemapUrl,
				title,
				url,
				isIndexed ? 1 : 0,
			]);

			res.status(200).json({ isIndexed });
			break; // Break the loop if successful
		} catch (error) {
			console.error("Error checking URL indexing:", error.message);

			if (error.response) {
				console.error("Error Response Data:", error.response.data);
				console.error("Error Response Status:", error.response.status);
				console.error(
					"Error Response Headers:",
					error.response.headers
				);

				if (error.response.status === 429) {
					const retryAfter = error.response.headers["retry-after"];
					delayMs = retryAfter
						? parseInt(retryAfter) * 1000
						: delayMs * 2; // Use Retry-After header if available, otherwise double the delay
					console.log(
						`Rate limited. Retrying after ${
							delayMs / 1000
						} seconds.`
					);
					await delay(delayMs);
					attempt++;
				} else {
					res.status(error.response.status).json({
						error: error.response.data,
					});
					break;
				}
			} else if (error.request) {
				console.error("Error Request:", error.request);
				res.status(500).json({
					error: "No response received from Google",
				});
				break;
			} else {
				console.error("Error Message:", error.message);
				res.status(500).json({ error: "Failed to check URL indexing" });
				break;
			}
		}
	}

	if (attempt === maxAttempts) {
		res.status(500).json({
			error: "Failed to check URL indexing after multiple attempts",
		});
	}
}
