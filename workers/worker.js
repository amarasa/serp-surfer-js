const mysql = require("mysql2");
const axios = require("axios");
const cheerio = require("cheerio");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
require("dotenv").config(); // Load environment variables from .env file

// Create a connection pool using environment variables
const pool = mysql
	.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		waitForConnections: true,
		connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
		queueLimit: 0,
	})
	.promise();

module.exports = pool;

const processQueue = async () => {
	while (true) {
		try {
			// Fetch the oldest URL from the queue
			const [[row]] = await pool.execute(
				`SELECT * FROM queued_urls ORDER BY id ASC LIMIT 1`
			);

			if (!row) {
				console.log("Queue is empty. Waiting for new URLs...");
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
						console.error(
							"Error fetching page title:",
							error.message
						);
					}

					// Update the sitemaps table
					await pool.execute(
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
					await pool.execute(`DELETE FROM queued_urls WHERE id = ?`, [
						id,
					]);

					console.log(`Processed and removed URL from queue: ${url}`);
				} catch (error) {
					console.error("Error processing URL:", error.message);
				}
			}
		} catch (err) {
			console.error("Database Error:", err.message);
		}

		await delay(30 * 1000); // Wait for 1 minute before checking again
	}
};

processQueue().catch((err) => {
	console.error("Worker encountered an error:", err.message);
	process.exit(1); // Exit the process in case of an unhandled error
});
