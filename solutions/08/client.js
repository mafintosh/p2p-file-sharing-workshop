// This program builds on exercise 04 and adds what we've learned about hashing
// in exercise 05 and 06 to validate the hash of the received file

var fs = require('fs')
var net = require('net')
var pump = require('pump')
var DC = require('discovery-channel')
var hasher = require('hash-of-stream')
var msgpack = require('msgpack5')()
var lpstream = require('length-prefixed-stream')

// Accept the id we want to fetch as an argument to the program
var id = process.argv[2]

if (!id) {
  console.log('Usage: node client.js [id]')
  process.exit(1)
}

var channel = DC()

channel.join(id)

channel.once('peer', function (peerId, peer, type) {
  console.log('New peer %s:%s found via %s', peer.host, peer.port, type)

  var socket = net.connect(peer.port, peer.host)
  var encode = lpstream.encode()
  var decode = lpstream.decode()

  console.log('Fetching %s...', id)

  decode.on('data', function (msg) {
    msg = msgpack.decode(msg)
    console.log('-- got msg:', msg)
  })

  pump(encode, socket, decode)
})

// Validate the hash of the downloaded file is as expected
function validate (filename, hash, callback) {
  hasher(file, function (hash2) {
    if (hash !== hash2) callback(new Error('File hash is invalid!'))
    else callback()
  })
}
