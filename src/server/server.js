import express from "express"
const app = express();
const port = 3000;

import *  as db from "./database/database.js"


// spits out Username 
app.get('/testOrganization', async (req, res) => {
  const username = await db.checkUsername({"username": {S: "Test_User"}});
  res.json(username);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}/testOrganization`);
});
