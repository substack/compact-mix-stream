var test = require('tape')
var mix = require('../')
var { Readable } = require('readable-stream')
var collect = require('collect-stream')
var varint = require('varint')

test('error', function (t) {
  t.plan(1)
  var s = mix.unpack(3)
  collect(s, check)
  s.end(Buffer.from(varint.encode(-5)))
  function check (err, docs) {
    t.ok(err, 'expected length error')
  }
})
