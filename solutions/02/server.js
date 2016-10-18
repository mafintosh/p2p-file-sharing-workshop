// This program builds on exercise 01 and shares your local file over HTTP
// instead of outputting in to STDOUT

var fs = require('fs')
var http = require('http')
var pump = require('pump')

var server = http.createServer(function (req, res) {
  var filename = __filename
  var file = fs.createReadStream(filename)

  console.log('Serving', filename)

  // pipe the file to the HTTP client
  pump(file, res)
})

server.listen(3000, function () {
  console.log('Server is running at http://localhost:3000')
})
