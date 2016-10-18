// This program outputs a local file to STDOUT (normally your terminal). It can
// be any type of file, but we recommend outputting a normal text file as some
// binary characters can mess up your terminal

var fs = require('fs')
var pump = require('pump')

// Any string pointing to a file on your harddrive will do, but the special
// `__filename` variable will always point to the current file (this file)
var filename = __filename

// Don't read the file just yet, but instead create a readable stream that are
// ready to be read by any program that can consume data streams
var file = fs.createReadStream(filename)

// We use the pump module instead of the built-in stream.pipe function because
// it manages the tricky edge-cases of pipe error handling
pump(file, process.stdout)
