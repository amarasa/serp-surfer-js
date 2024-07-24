const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./sitemaps.db");

db.serialize(() => {
	db.run(`
    CREATE TABLE IF NOT EXISTS sitemaps (
      id INTEGER PRIMARY KEY,
      sitemap_url TEXT,
      page_title TEXT,
      page_url TEXT UNIQUE,
      index_status INTEGER,
      last_scan TIMESTAMP
    )
  `);
});

module.exports = db;
