var crypto = require('crypto')
var fs = require('fs')

var filename = __filename
var file = fs.createReadStream(filename)
var hash = crypto.createHash('sha256')

// The `file` object is a readable stream. Let's update hash object with the
// content of the file
file.on('data', function (chunk) {
  hash.update(chunk)
})

// When we have read the entire file, let's print out the hash
file.on('end', function () {
  var digest = hash.digest()
  console.log('The hash of %s is: %s', filename, digest.toString('hex'))
})
