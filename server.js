//imports
const express = require('express')
const path = require('path')
const db = require('./src/database.js')

const app = express();
const port = 3000;



// for static files from public folder
app.use(express.json())
app.use(express.static(path.join(__dirname, '/public')))

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get('/map', (req, res) => {
	res.sendFile(path.join(__dirname, "public/map/index.html"));
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}/home`);
});


app.post('/register', async (req, res) => {
	// gets info from html
	const { username, password, zipCode} = req.body;
	const result = await db.inputUserInfo(username, password, zipCode);
	console.log(username);

	if(result == 0) {
		res.send("Sucess");
	}
	else if(result == -1){
		res.send("Already Exists")
	}
	else{
		res.send("Error!");
	}
});
