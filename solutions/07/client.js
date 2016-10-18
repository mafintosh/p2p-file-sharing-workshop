// This program builds on exercise 04 and adds what we've learned about hashing
// in exercise 05 and 06 to validate the hash of the received file

var fs = require('fs')
var net = require('net')
var pump = require('pump')
var DC = require('discovery-channel')
var hasher = require('hash-of-stream')

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

  var filename = 'file-' + Date.now() + '.js'
  var socket = net.connect(peer.port, peer.host)
  var file = fs.createWriteStream(filename)

  console.log('Fetching %s...', id)

  pump(socket, file, function (err) {
    if (err) throw err

    channel.destroy()
    console.log('Data received and stored as %s - verifying...', filename)

    // Expect the id of the channel to be the hash of the file
    validate(filename, id, function (err) {
      if (err) throw err
      console.log('File content is valid :)')
    })
  })
})

// Validate the hash of the downloaded file is as expected
function validate (filename, hash, callback) {
  hasher(file, function (hash2) {
    if (hash !== hash2) callback(new Error('File hash is invalid!'))
    else callback()
  })
}
