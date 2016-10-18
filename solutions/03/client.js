// This is a client program that connects to a TCP server (server.js), and
// stores whatever it sends in file in the current directory

var fs = require('fs')
var net = require('net')
var pump = require('pump')

// Let's create a new filename every time the client program runs
var filename = 'file-' + Date.now() + '.js'

// Connect to a TCP server on localhost port 3000
var socket = net.connect(3000, 'localhost')

// Prepare a file stream to be written to
var file = fs.createWriteStream(filename)

console.log('Saving %s...', filename)

// Pipe anything arriving on the TCP socket to the file
pump(socket, file, function (err) {
  if (err) throw err
  console.log('File successfully written to disk')
})
