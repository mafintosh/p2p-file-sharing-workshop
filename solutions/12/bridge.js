var http = require('http')
var parseRange = require('range-parser')
var from = require('from2')
var pump = require('pump')

var id = process.argv[2]

if (!id) {
  console.log('Usage: node bridge.js [id]')
  process.exit(1)
}

var client = require('./client')(id)

var server = http.createServer(function (req, res) {
  console.log(req.method, req.url)

  client.getHandshake(function (err, handshake) {
    if (err) throw err

    // We only need to support a range header with one set of bytes
    var range = req.headers.range && parseRange(handshake.fileSize, req.headers.range)[0]

    res.setHeader('Access-Ranges', 'bytes')
    res.setHeader('Content-Type', handshake.mimeType)
    // TODO: Set Content-Type header as well

    if (!range || range < 0) {
      res.setHeader('Content-Length', handshake.fileSize)
      if (req.method === 'HEAD') return res.end()
      pump(createStream(), res)
    } else {
      res.statusCode = 206
      res.setHeader('Content-Length', range.end - range.start + 1)
      res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + handshake.fileSize)
      if (req.method === 'HEAD') return res.end()
      // TODO: Stream segment file
      pump(createStream(range), res)
    }

    function createStream (opts) {
      if (!opts) opts = {}
      if (!opts.end) opts.end = handshake.fileSize
      if (!opts.start) opts.start = 0

      var length = opts.end - opts.start + 1
      var offset = opts.start % handshake.chunkSize
      var i = Math.floor(opts.start / handshake.chunkSize)

      return from(function (size, cb) {
        if (!length || i >= handshake.hashes.length) return cb(null, null)

        client.getData(i++, function (err, data) {
          if (err) return cb(err)

          if (offset) {
            data = data.slice(offset)
            offset = 0
          }

          if (data.length > length) {
            data = data.slice(0, length)
          }

          length -= data.length
          cb(null, data)
        })
      })
    }
  })
})

server.listen(3000, function () {
  console.log('server listening on port 3000')
})
