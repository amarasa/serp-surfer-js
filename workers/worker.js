const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const dbPath = process.env.DATABASE_PATH || path.resolve("/tmp", "sitemaps.db");

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error("Could not open database", err.message);
	} else {
		console.log("Connected to database at", dbPath);
	}
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async () => {
	while (true) {
		db.get(
			`SELECT * FROM queued_urls ORDER BY id ASC LIMIT 1`,
			async (err, row) => {
				if (err) {
					console.error("Database Error:", err.message);
				} else if (!row) {
					console.log("Queue is empty. Waiting for new URLs...");
				} else {
					const { id, url, sitemap_url } = row;
					console.log(`Processing URL: ${url}`);

					try {
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

						// Fetch the page title regardless of the index status
						const pageResponse = await axios.get(url, {
							headers: {
								"User-Agent":
									"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
							},
						});
						const $$ = cheerio.load(pageResponse.data);
						const title = $$("title").text() || "No title";

						db.run(
							`
                        INSERT INTO sitemaps (sitemap_url, page_title, page_url, index_status, last_scan)
                        VALUES (?, ?, ?, ?, datetime('now', 'utc'))
                        ON CONFLICT(page_url) DO UPDATE SET
                            index_status=excluded.index_status,
                            last_scan=datetime('now', 'utc'),
                            page_title=excluded.page_title
                        `,
							[sitemap_url, title, url, isIndexed ? 1 : 0],
							(err) => {
								if (err) {
									console.error(
										"Database Error:",
										err.message
									);
								}
							}
						);

						db.run(
							`DELETE FROM queued_urls WHERE id = ?`,
							[id],
							(err) => {
								if (err) {
									console.error(
										"Database Error:",
										err.message
									);
								} else {
									console.log(
										`Processed and removed URL from queue: ${url}`
									);
								}
							}
						);
					} catch (error) {
						console.error("Error processing URL:", error.message);
					}
				}
			}
		);

		await delay(60 * 1000); // Wait for 1 minute before checking again
	}
};

processQueue();
