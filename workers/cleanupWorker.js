const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./sitemaps.db");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanupDatabase = async () => {
	while (true) {
		const seventyTwoHoursAgo = new Date(
			Date.now() - 72 * 60 * 60 * 1000
		).toISOString();

		db.run(
			`DELETE FROM sitemaps WHERE last_scan < ?`,
			[seventyTwoHoursAgo],
			function (err) {
				if (err) {
					console.error("Error cleaning up database:", err.message);
				} else {
					console.log(
						`Deleted ${this.changes} entries older than 72 hours.`
					);
				}
			}
		);

		await delay(60 * 60 * 1000); // Run cleanup once every hour
	}
};

cleanupDatabase();
