// /pages/api/cleanup.js
import db from "../../lib/database";

const cleanupDatabase = async (req, res) => {
	try {
		const seventyTwoHoursAgo = new Date(
			Date.now() - 72 * 60 * 60 * 1000
		).toISOString();

		db.run(
			`DELETE FROM sitemaps WHERE last_scan < ?`,
			[seventyTwoHoursAgo],
			function (err) {
				if (err) {
					console.error("Error cleaning up database:", err.message);
					return res.status(500).json({ error: err.message });
				} else {
					console.log(
						`Deleted ${this.changes} entries older than 72 hours.`
					);
					return res
						.status(200)
						.json({
							message: `Deleted ${this.changes} entries older than 72 hours.`,
						});
				}
			}
		);
	} catch (error) {
		console.error("Error cleaning up database:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

export default cleanupDatabase;
