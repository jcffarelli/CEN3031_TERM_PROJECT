const express = require('express');
const app = express();
const port = 3000;
const webRoutes = require("./routes/Website.routes");

/*
app.get('/', (req, res) => {
  res.sendFile('public/index.html', {root: __dirname})
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
 */

app.use(`/`, route);

module.exports = app;