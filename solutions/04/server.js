// This program builds on exercise 03 and allows for TCP clients to discover
// the server automatically on the network

var fs = require('fs')
var net = require('net')
var pump = require('pump')
var DC = require('discovery-channel')

// Initialize a new channel
// In this example we disable the global DHT so not to spam it every time we
// run the server. In a real app, you'd normally like to use the DHT.
var channel = DC({dht: false})

var server = net.createServer(function (socket) {
  console.log('New peer connected: %s:%s', socket.remoteAddress, socket.remotePort)

  var file = fs.createReadStream(__filename)

  // pipe the file to the TCP client
  pump(file, socket)
})

// By not specifying a port to listen to, this server will listen on a random
// available port assigned to it by the operation system
server.listen(function () {
  // The server needs an ID that the clients can later join. For now, let's use
  // our local username to ensure that it's semi-unique
  var id = process.argv[2] || process.env.USER || 'my-server'

  // Figure out which port we got assigned
  var port = server.address().port

  // Start announcing that the server is online
  channel.join(id, port)

  console.log('Server named %s is listening on port %d', id, port)
})
