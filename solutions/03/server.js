// This program builds on exercise 02 and shares your local file over a simple
// TCP connection instead of HTTP

var fs = require('fs')
var net = require('net')
var pump = require('pump')

var server = net.createServer(function (socket) {
  var filename = __filename
  var file = fs.createReadStream(filename)

  console.log('Serving', filename)

  // pipe the file to the TCP client
  pump(file, socket)
})

server.listen(3000, function () {
  console.log('Server is listening on port 3000')
})
