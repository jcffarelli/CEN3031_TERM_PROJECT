const express = require('express')
const app = express()
const port = 3000
const path = require('path')
const cors = require('cors')

app.use(cors())

// Serve Parcel-built files from the dist directory
app.use(express.static(path.join(__dirname, '../public/dist')))

// Serve other static assets (for development)
app.use('/assets', express.static(path.join(__dirname, '../public/assets')))

// For non-dist static files
app.use(express.static(path.join(__dirname, '../public')))

// Catch-all route to serve the main HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dist/index.html'))
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
  console.log(`Visit http://localhost:${port} to view your app`)
})