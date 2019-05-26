var test = require('tape')
var mix = require('../')
var { Readable } = require('readable-stream')
var collect = require('collect-stream')
var { randomBytes } = require('crypto')

test('queue [2]', function (t) {
  t.plan(200)
  ;(function next (i) {
    if (i < 100) check(t, function () { next(i+1) })
  })(0)
})

function check (t, cb) {
  var a = new Readable({ read: noop, objectMode: true })
  var b = new Readable({ read: noop, objectMode: true })
  collect(mix.pack([ a, b ]).pipe(mix.unpack(2)), oncollect)
  var expected = []
  for (var i = 0; i < 100; i++) {
    var abuf = randomBytes(Math.floor(Math.random()*1023+1))
    var bbuf = randomBytes(Math.floor(Math.random()*1023+1))
    a.push(abuf)
    b.push(bbuf)
    expected.push({ channel: 0, data: abuf })
    expected.push({ channel: 1, data: bbuf })
  }
  a.push(null)
  b.push(null)

  function oncollect (err, docs) {
    t.error(err)
    t.deepEqual(docs, expected)
    cb()
  }
}

function noop () {}
