//imports
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// define path/directory
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const app = express();
const port = 3000;

import * as db from "./database.js"

// Uses public directory to serve files to client
app.use(express.static(dirname + '/public'));

app.use(express.urlencoded({extended: false}));

app.get('/', (req, res) => {
  res.sendFile('home.html', { root: dirname } );
});

app.get('/registration.html', (req, res) => {
	res.sendFile('registration.html', { root: dirname } );
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});


app.post('/register', async (req, res) => {
	// gets info from html
	const { username, password } = req.body;
	const result = await db.inputUserInfo(username, password);

	if(result == 0){
		res.send("Sucess");
	}
	else if(result == -1){
		res.send("Already Exists")
	}
	else{
		res.send("Error!");
	}
});
