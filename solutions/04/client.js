// This is a client program that connects to a TCP server (server.js), and
// stores whatever it sends in file in the current directory

var fs = require('fs')
var net = require('net')
var pump = require('pump')
var DC = require('discovery-channel')

// Initialize a new channel
var channel = DC()

// The client needs to know which server ID to join. Expect the ID is
// provided as the first argument when running the client program
var id = process.argv[2]

// By specifying only an id and not a port, we don't announce our
// presence in the swarm. Instead DC will simply try to connect to peers
// that do announcing their presence
channel.join(id)

channel.once('peer', function (peerId, peer, type) {
  console.log('New peer %s:%s found via %s:', peer.host, peer.port, type)

  // Use the host/port provided by the peer object given to us by DC
  var socket = net.connect(peer.port, peer.host)

  var filename = 'file-' + Date.now() + '.js'
  var file = fs.createWriteStream(filename)

  console.log('Fetching %s...', filename)

  pump(socket, file, function (err) {
    if (err) throw err
    console.log('File successfully written to disk')

    // Stop listening on the channel (will exit the program)
    channel.destroy()
  })
})
