//imports
const express = require('express')
const path = require('path')
const db = require('./src/database.js')
const app = express();
const port = 3000;
const cookieParser = require('cookie-parser');

app.use(express.json())
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.urlencoded({ extended: false }));
app.use('/map', express.static(path.join(__dirname, 'public/map/dist')));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '/public')));

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get('/login', (req, res) => {
	var cookie = req.cookies.cookieName;
	if (cookie == undefined) {
		res.sendFile(path.join(__dirname, "public/login.html"));
	}
	else {
		res.send("Already Logged In");
	}
});

app.get('/signup', (req, res) => {
	res.sendFile(path.join(__dirname, "public/signup.html"));
});

app.get('/signup/error', (req, res) => {
	res.sendFile(path.join(__dirname, "public/signup-error.html"));
});

app.get('/signup/already-exists', (req, res) => {
	res.sendFile(path.join(__dirname, "public/signup-error.html"));
});

app.get('/signup/success', (req, res) => {
	res.sendFile(path.join(__dirname, "public/signup-success.html"));
});

app.get('/map', (req, res) => {
	res.sendFile(path.join(__dirname, "public/map/dist/index.html"));
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}/home`);
});


app.post('/register', async (req, res) => {
	// gets info from html
	const { username, password, zip} = req.body;
	if (zip == null) zip = "00000";
	const result = await db.inputUserInfo(username, password, zip);

	if(result == 0){
		res.redirect('/signup/success');
		// res.cookie('username', username);
	}
	else if(result == -1){
		res.redirect('/signup/already-exists');
	}
	else{
		res.redirect('/signup/error');
	}
});

app.post('/login', async (req, res) => {
	// gets info from html
	const { username, password} = req.body;
	zip = 12345;

	const result = await db.inputUserInfo(username, password, zip);

	if (result == -1) {
		res.send("User does exists")
	}

	else {
		res.send("User does not exist");
	}
});

