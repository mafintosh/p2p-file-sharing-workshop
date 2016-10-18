// This program builds on exercise 04 and adds what we've learned about hashing
// in exercise 05 and 06 to automatically join a channel with the id of the
// file-hash we're sharing

var fs = require('fs')
var net = require('net')
var pump = require('pump')
var DC = require('discovery-channel')
var hasher = require('hash-of-stream')

// Accept the filename we want to share as an argument to the program
var filename = process.argv[2]

if (!filename) {
  console.log('Usage: node server.js [filename]')
  process.exit(1)
}

var file = fs.createReadStream(filename)

// Get the hash of the file
hasher(file, function (hash) {
  var channel = DC()

  var server = net.createServer(function (socket) {
    console.log('New peer connected: %s:%s', socket.remoteAddress, socket.remotePort)
    var file = fs.createReadStream(filename)
    pump(file, socket)
  })

  server.listen(function () {
    // join a channel with the id being equal to the file hash
    channel.join(hash, server.address().port)
    console.log('Sharing %s as %s', filename, hash)
  })
})
