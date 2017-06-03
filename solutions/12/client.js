// This program builds on exercise 11 and allows streaming of video with
// support for scrubbing

var os = require('os')
var net = require('net')
var path = require('path')
var crypto = require('crypto')
var DC = require('discovery-channel')
var msgpack = require('msgpack5-stream')
var Bitfield = require('bitfield')
var fsChunkStore = require('fs-chunk-store')

module.exports = function (id) {
  var channel = DC({dht: false}) // set true to work over the internet
  var downloaded = new Bitfield(1024, {grow: Infinity})
  var filename = path.join(os.tmpdir(), id)
  var queue = []
  var fetchers = []
  var connected = {}
  var handshake
  var file

  channel.join(id)

  channel.on('peer', function (peerId, peer, type) {
    console.log('New peer %s:%s found via %s', peer.host, peer.port, type)

    if (connected[peerId.toString('hex')]) return
    connected[peerId.toString('hex')] = true

    var socket = net.connect(peer.port, peer.host)
    var protocol = msgpack(socket)

    protocol.once('data', function (msg) {
      var hashes = msg.hashes
      if (!hashValidate(hashes.join('\n'), id)) throw new Error('Invalid hashes!')

      if (!file) {
        handshake = msg
        console.log('Storing temp file:', filename)
        file = fsChunkStore(msg.chunkSize, {path: filename, length: msg.fileSize})
      }

      protocol.on('data', function (msg) {
        if (!hashValidate(msg.data, hashes[msg.index])) throw new Error('Invalid chunk hash!')

        file.put(msg.index, msg.data, function (err) {
          if (err) throw err
          downloaded.set(msg.index)

          queue = queue.filter(function (w) {
            if (w.index === msg.index) {
              process.nextTick(function () {
                w.cb(null, msg.data)
              })
              return false
            }
            return true
          })

          fetchNextChunk()
        })
      })

      fetchNextChunk()

      fetchers.push(fetchNextChunk)

      function fetchNextChunk () {
        for (var i = 0; i < queue.length; i++) {
          if (!downloaded.get(queue[i].index)) return download(queue[i].index)
        }
      }

      function download (chunk) {
        console.log('Fetching chunk %d...', chunk)
        protocol.write({type: 'request', index: chunk})
      }
    })
  })

  return {
    getHandshake: getHandshake,
    getData: getData
  }

  function hashValidate (value, expected) {
    var hash = crypto.createHash('sha256')
      .update(value)
      .digest()
      .toString('hex')

    return hash === expected
  }

  function getHandshake (cb) {
    getData(0, function (err) {
      if (err) return cb(err)
      return cb(null, handshake)
    })
  }

  function getData (index, cb) {
    if (!downloaded.get(index)) return pushToQueue(index, cb)
    file.get(index, function (err, data) {
      if (err) return pushToQueue(index, cb)
      cb(null, data)
    })
  }

  function pushToQueue (index, cb) {
    queue.push({index: index, cb: cb})
    fetchers.forEach(function (fetcher) {
      fetcher()
    })
  }
}
