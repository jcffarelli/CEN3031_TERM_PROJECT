const express = require('express');
const app = express();
const router = express.Router();

const path = require('path');

app.get('/index', (req, res) => {
    res.sendFile(path.resolve('server/public/index.html'))
});

router.get('/login.html', (req, res) => {
    res.sendFile(path.resolve('server/public/login.html'))
});

router.get('/signup.html', (req, res) => {
    res.sendFile(path.resolve('server/public/signup.html'))
});

module.exports = router;