// This program builds on exercise 08 and extends the client to download only a
// requested chunk and validating its hash

var fs = require('fs')
var net = require('net')
var crypto = require('crypto')
var DC = require('discovery-channel')
var msgpack = require('msgpack5-stream')

// Accept the id we want to fetch as the 1st argument to the program
var id = process.argv[2]
// Accept the chunk we want to fetch as the 2nd argument to the program
var chunk = Number(process.argv[3])

if (process.argv.length < 4) {
  console.log('Usage: node client.js [id] [chunk]')
  process.exit(1)
}

var channel = DC()

channel.join(id)

channel.once('peer', function (peerId, peer, type) {
  console.log('New peer %s:%s found via %s', peer.host, peer.port, type)

  var socket = net.connect(peer.port, peer.host)

  // Wrap our TCP socket with a msgpack5 protocol wrapper
  var protocol = msgpack(socket)

  // Listen of the server handshake
  protocol.once('data', function (msg) {
    // Get the array of hashes from the handshake message
    var hashes = msg.hashes

    // Validate that the hashes have not been compromised
    if (!hashValidate(hashes.join('\n'), id)) throw new Error('Invalid hashes!')

    // Listen for the chunks
    protocol.on('data', function (msg) {
      // Validate that the hash matches the expected hash
      if (!hashValidate(msg.data, hashes[chunk])) throw new Error('Invalid chunk hash!')

      // For now just log out the msg object if it's valid
      console.log(msg)
    })

    // Fetch the chunk that the user requested
    console.log('Fetching chunk %d from %s...', chunk, id)
    protocol.write({type: 'request', chunk: chunk})
  })
})

function hashValidate (value, expected) {
  var hash = crypto.createHash('sha256')
    .update(value)
    .digest()
    .toString('hex')
  console.log(hash, expected)

  return hash === expected
}
