const mysql = require("mysql2");
require("dotenv").config(); // Load environment variables from .env file

// Create a connection pool using environment variables
const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
	queueLimit: 0,
});

// Use the promise version of the pool
const db = pool.promise();

module.exports = db;

// Schema creation
db.execute(
	`
  CREATE TABLE IF NOT EXISTS sitemaps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sitemap_url VARCHAR(255),
    page_title VARCHAR(255),
    page_url VARCHAR(255) UNIQUE,
    index_status BOOLEAN,
    last_scan TIMESTAMP
  )
`
)
	.then(() => {
		console.log("sitemaps table created or already exists.");
	})
	.catch((err) => {
		console.error("Error creating sitemaps table:", err.message);
	});

db.execute(
	`
  CREATE TABLE IF NOT EXISTS queued_urls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sitemap_url VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    UNIQUE(sitemap_url, url)
  )
`
)
	.then(() => {
		console.log("queued_urls table created or already exists.");
	})
	.catch((err) => {
		console.error("Error creating queued_urls table:", err.message);
	});

// Export the promise pool for use in other files
module.exports = db;
