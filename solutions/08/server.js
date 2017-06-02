// This program introduces chunking to allow us to share just a priece of the
// file

var fs = require('fs')
var net = require('net')
var DC = require('discovery-channel')
var msgpack = require('msgpack5-stream')
var fsChunkStore = require('fs-chunk-store')

// Accept the id of the channel we want to create as the 1st argument to the program
var id = process.argv[2]
// Accept the filename we want to share as the 2nd argument to the program
var filename = process.argv[3]

if (!id || !filename) {
  console.log('Usage: node server.js [id] [filename]')
  process.exit(1)
}

var CHUNK_SIZE = 1024
var FILE_LENGTH = fs.statSync(filename).size
var file = fsChunkStore(CHUNK_SIZE, {path: filename, length: FILE_LENGTH})
var channel = DC()

var server = net.createServer(function (socket) {
  console.log('New peer connected: %s:%s', socket.remoteAddress, socket.remotePort)

  // Wrap our TCP socket with a msgpack5 protocol wrapper
  var protocol = msgpack(socket)

  protocol.on('data', function (msg) {
    if (msg.type === 'request') {
      file.get(msg.index, function (err, buf) {
        if (err) throw err
        protocol.write({type: 'response', index: msg.index, data: buf})
      })
    }
  })
})

server.listen(function () {
  channel.join(id, server.address().port)
  console.log('Sharing %s as %s', filename, id)
})
