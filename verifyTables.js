const db = require("./src/lib/database");

db.serialize(() => {
	db.all(
		"SELECT name FROM sqlite_master WHERE type='table'",
		(err, tables) => {
			if (err) {
				console.error("Error fetching tables:", err.message);
			} else {
				console.log("Tables in database:", tables);
			}
		}
	);
});
