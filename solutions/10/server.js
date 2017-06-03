// This program is the exact same as in exercise 09

var fs = require('fs')
var net = require('net')
var crypto = require('crypto')
var DC = require('discovery-channel')
var msgpack = require('msgpack5-stream')
var fsChunkStore = require('fs-chunk-store')
var hasher = require('fixed-size-chunk-hashing')

var filename = process.argv[2]

if (!filename) {
  console.log('Usage: node server.js [filename]')
  process.exit(1)
}

var CHUNK_SIZE = 1024
var fileSize = fs.statSync(filename).size
var file = fs.createReadStream(filename)

file.pipe(hasher(CHUNK_SIZE, function (err, hashes) {
  if (err) throw err

  var id = crypto.createHash('sha256')
    .update(hashes.join('\n'))
    .digest()
    .toString('hex')
  var file = fsChunkStore(CHUNK_SIZE, {path: filename, length: fileSize})
  var channel = DC({dht: false}) // set true to work over the internet

  var server = net.createServer(function (socket) {
    console.log('New peer connected: %s:%s', socket.remoteAddress, socket.remotePort)

    var protocol = msgpack(socket)

    protocol.on('data', function (msg) {
      if (msg.type === 'request') {
        file.get(msg.index, function (err, buf) {
          if (err) throw err
          protocol.write({type: 'response', index: msg.index, data: buf})
        })
      }
    })

    protocol.write({
      type: 'handshake',
      hashes: hashes,
      chunkSize: CHUNK_SIZE,
      fileSize: fileSize
    })
  })

  server.listen(function () {
    channel.join(id, server.address().port)
    console.log('Sharing %s as %s', filename, id)
  })
}))
