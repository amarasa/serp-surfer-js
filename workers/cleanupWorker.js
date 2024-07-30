const mysql = require("mysql2");
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

const cleanupDatabase = async () => {
	while (true) {
		try {
			const seventyTwoHoursAgo = new Date(
				Date.now() - 72 * 60 * 60 * 1000
			)
				.toISOString()
				.slice(0, 19)
				.replace("T", " "); // Format for MySQL datetime

			// Delete entries older than 72 hours
			const [result] = await pool.execute(
				`DELETE FROM sitemaps WHERE last_scan < ?`,
				[seventyTwoHoursAgo]
			);

			console.log(
				`Deleted ${result.affectedRows} entries older than 72 hours.`
			);
		} catch (err) {
			console.error("Error cleaning up database:", err.message);
		}

		await delay(60 * 60 * 1000); // Run cleanup once every hour
	}
};

cleanupDatabase().catch((err) => {
	console.error("Cleanup process encountered an error:", err.message);
	process.exit(1); // Exit the process in case of an unhandled error
});
