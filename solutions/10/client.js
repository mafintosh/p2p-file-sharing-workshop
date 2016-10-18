// This program builds on exercise 09 and completes the client by downloading
// and validating all hashes

var net = require('net')
var crypto = require('crypto')
var DC = require('discovery-channel')
var msgpack = require('msgpack5-stream')
var Bitfield = require('bitfield')
var fsChunkStore = require('fs-chunk-store')

var id = process.argv[2]
var filename = process.argv[3]

if (!id || !filename) {
  console.log('Usage: node client.js [id] [filename]')
  process.exit(1)
}

var channel = DC()

// Create a bitfield which is useful for keeping track of which chunks we have
// already downloaded
var downloaded = new Bitfield(1024, {grow: Infinity})

channel.join(id)

channel.once('peer', function (peerId, peer, type) {
  console.log('New peer %s:%s found via %s', peer.host, peer.port, type)

  var socket = net.connect(peer.port, peer.host)
  var protocol = msgpack(socket)

  protocol.once('data', function (msg) {
    var hashes = msg.hashes
    if (!hashValidate(hashes.join('\n'), id)) throw new Error('Invalid hashes!')

    // Prepare the file to which we'll write all the chunks
    var file = fsChunkStore(msg.chunkSize, {path: filename, length: msg.fileSize})

    protocol.on('data', function (msg) {
      if (!hashValidate(msg.data, hashes[msg.chunk])) throw new Error('Invalid chunk hash!')

      // Store the downloaded chunk in the file
      file.put(msg.chunk, msg.data, function (err) {
        if (err) throw err
        // Register the chunk number as being donwloaded
        downloaded.set(msg.chunk)
        // Download the next chunk
        fetchNextChunk()
      })
    })

    // Fetch the first chunk
    fetchNextChunk()

    function fetchNextChunk () {
      // First try to get a random chunk to spread the load a little
      var chunk = Math.floor(Math.random() * hashes.length)
      if (!downloaded.get(chunk)) return download(chunk)

      // If the random chunk was already downloaded, just find the first
      // missing chunk and download that
      for (chunk = 0; chunk < hashes.length; chunk++) {
        if (!downloaded.get(chunk)) return download(chunk)
      }

      // If we reach this point, it means that we're all done :)
      console.log('File %s downloaded :)', filename)
      process.exit(0)
    }

    function download (chunk) {
      console.log('Fetching chunk %d...', chunk)
      protocol.write({type: 'request', chunk: chunk})
    }
  })
})

function hashValidate (value, expected) {
  var hash = crypto.createHash('sha256')
    .update(value)
    .digest()
    .toString('hex')

  return hash === expected
}
