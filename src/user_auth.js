// not finished

async function create(username, password) {
	// const { username, password } = req.body;

	// Input Validation
	const errors = []

	if (typeof username !== "string") username = ""
	if (typeof password !== "string") password = ""

	username = username.trim()
	
	// Check whether the username exists
	const userExistQuery = "SELECT * FROM USERS WHERE USERNAME = ?";
	const search_query = mysql.format(, [USERNAME]);

	const insert_query = "INSERT INTO (USERNAME, PASSWORD) VALUES (?, ?)";
	const result = await db.pool.query(insert_query, [USERNAME, PASSWORD]);

}

/*
async function login(req, res) {
}
*/
