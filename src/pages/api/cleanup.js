// /pages/api/cleanup.js
import db from "../../lib/database";

const cleanupDatabase = async (req, res) => {
	try {
		const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 19)
			.replace("T", " "); // Format for MySQL datetime

		const [result] = await db.execute(
			`DELETE FROM sitemaps WHERE last_scan < ?`,
			[seventyTwoHoursAgo]
		);

		console.log(
			`Deleted ${result.affectedRows} entries older than 72 hours.`
		);
		return res.status(200).json({
			message: `Deleted ${result.affectedRows} entries older than 72 hours.`,
		});
	} catch (error) {
		console.error("Error cleaning up database:", error.message);
		return res.status(500).json({ error: error.message });
	}
};

export default cleanupDatabase;
