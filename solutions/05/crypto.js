var crypto = require('crypto')

// You have a string that you want to encode
var string = 'NodeConf EU 2016'

// Prepare a hash object using the sha256 hashing algorithm
var hash = crypto.createHash('sha256')

// Add the string to the hash object to encode it
hash.update(string)

// Get the hashed version of the string as a Buffer
var digest = hash.digest()

// Print out the hash in hex form
console.log('%s => %s', string, digest.toString('hex'))
