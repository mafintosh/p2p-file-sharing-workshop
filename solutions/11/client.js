// This program builds on exercise 10 and allows for downloading the chunks
// from multiple servers

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

var channel = DC({dht: false}) // set true to work over the internet
var downloaded = new Bitfield(1024, {grow: Infinity})
var file

channel.join(id)

channel.on('peer', function (peerId, peer, type) {
  console.log('New peer %s:%s found via %s', peer.host, peer.port, type)

  var socket = net.connect(peer.port, peer.host)
  var protocol = msgpack(socket)

  protocol.once('data', function (msg) {
    var hashes = msg.hashes
    if (!hashValidate(hashes.join('\n'), id)) throw new Error('Invalid hashes!')

    if (!file) file = fsChunkStore(msg.chunkSize, {path: filename, length: msg.fileSize})

    protocol.on('data', function (msg) {
      if (!hashValidate(msg.data, hashes[msg.index])) throw new Error('Invalid chunk hash!')

      file.put(msg.index, msg.data, function (err) {
        if (err) throw err
        downloaded.set(msg.index)
        fetchNextChunk()
      })
    })

    fetchNextChunk()

    function fetchNextChunk () {
      var chunk = Math.floor(Math.random() * hashes.length)
      if (!downloaded.get(chunk)) return download(chunk)

      for (chunk = 0; chunk < hashes.length; chunk++) {
        if (!downloaded.get(chunk)) return download(chunk)
      }

      console.log('File %s downloaded :)', filename)
      process.exit(0)
    }

    function download (chunk) {
      console.log('Fetching chunk %d...', chunk)
      protocol.write({type: 'request', index: chunk})
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
