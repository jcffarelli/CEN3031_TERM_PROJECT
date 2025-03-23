const express = require('express');
const app = express();
// const AWS = require('aws-sdk')
// const DynamoDB = new AWS.DynamoDB();
const port = 3000;

app.use(express.urlencoded({extended: false}));


// connect to the database ?
/*
const db = mariadb.createPool({
	host: '127.0.0.1',
	user: 'user1',
	password: 'password1',
	connectionLimit: 5
});

db.getConnection( (err, connection) => {
	console.log ("Successful connection to database: " + connection.threadId)
})

*/

app.get('/', (req, res) => {
  res.sendFile('registration.html', { root: __dirname } );
});


// Not necessary ?
/*
app.get('/register', (req, res) => {
  res.sendFile('registration.html', { root: __dirname } );
});
*/

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

app.post('/register', (req, res) => {
	const { username, password } = req.body;
	console.log(username);
	console.log(password);
	res.send('Working?');
	// not finished 
	// create(username, password);
});
