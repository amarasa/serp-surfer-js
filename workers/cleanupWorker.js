const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const dbPath = process.env.DATABASE_PATH || path.resolve("/tmp", "sitemaps.db");

// Ensure the /tmp directory exists and is writable
if (!fs.existsSync("/tmp")) {
	fs.mkdirSync("/tmp");
}

// Create the database file if it doesn't exist
if (!fs.existsSync(dbPath)) {
	fs.writeFileSync(dbPath, "");
}

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error("Could not open database", err.message);
	} else {
		console.log("Connected to database at", dbPath);
	}
});

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
