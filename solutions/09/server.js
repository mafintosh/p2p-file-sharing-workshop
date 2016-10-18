// This program builds on exercise 08 and completes the server by exposing
// hashes of all the chunks in a handshake

var fs = require('fs')
var net = require('net')
var crypto = require('crypto')
var DC = require('discovery-channel')
var msgpack = require('msgpack5-stream')
var fsChunkStore = require('fs-chunk-store')
var hasher = require('fixed-size-chunk-hashing')

// Accept the filename we want to share as an argument to the program
var filename = process.argv[2]

if (!filename) {
  console.log('Usage: node server.js [filename]')
  process.exit(1)
}

var CHUNK_SIZE = 1024
var file = fs.createReadStream(filename)

file.pipe(hasher(CHUNK_SIZE, function (err, hashes) {
  if (err) throw err

  var id = crypto.createHash('sha256')
    .update(hashes.join('\n'))
    .digest()
    .toString('hex')
  var file = fsChunkStore(CHUNK_SIZE, {path: filename})
  var channel = DC()

  var server = net.createServer(function (socket) {
    console.log('New peer connected: %s:%s', socket.remoteAddress, socket.remotePort)

    var protocol = msgpack(socket)

    protocol.on('data', function (msg) {
      if (msg.type === 'request') {
        file.get(msg.chunk, function (err, buf) {
          if (err) throw err
          protocol.write({type: 'response', chunk: msg.chunk, data: buf})
        })
      }
    })

    // Send the hash of each chunk to the client when it connects
    protocol.write({ type: 'handshake', hashes: hashes })
  })

  server.listen(function () {
    channel.join(id, server.address().port)
    console.log('Sharing %s as %s', filename, id)
  })
}))
