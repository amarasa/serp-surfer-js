const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Define the database path using the /tmp directory in Vercel
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

db.serialize(() => {
	db.run(
		`
        CREATE TABLE IF NOT EXISTS sitemaps (
            id INTEGER PRIMARY KEY,
            sitemap_url TEXT,
            page_title TEXT,
            page_url TEXT UNIQUE,
            index_status INTEGER,
            last_scan TIMESTAMP
        )
    `,
		(err) => {
			if (err) {
				console.error("Error creating sitemaps table:", err.message);
			} else {
				console.log("sitemaps table created or already exists.");
			}
		}
	);

	db.run(
		`
        CREATE TABLE IF NOT EXISTS queued_urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sitemap_url TEXT NOT NULL,
            url TEXT NOT NULL,
            UNIQUE(sitemap_url, url)
        )
    `,
		(err) => {
			if (err) {
				console.error("Error creating queued_urls table:", err.message);
			} else {
				console.log("queued_urls table created or already exists.");
			}
		}
	);
});

module.exports = db;
