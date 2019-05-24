var test = require('tape')
var mix = require('../')
var { Readable, Transform } = require('readable-stream')
var collect = require('collect-stream')
var { randomBytes } = require('crypto')

test('random chunks [1-20]', function (t) {
  var pending = 50
  t.plan(2*pending)
  run(t, function next () {
    if (--pending !== 0) run(t, next)
  })
})

function run (t, cb) {
  var streams = []
  var nstreams = Math.floor(Math.random()*19)+1
  for (var i = 0; i < nstreams; i++) {
    streams.push(new Readable({ read: noop }))
  }
  collect(mix.pack(streams)
    .pipe(scramble(200))
    .pipe(mix.unpack(streams.length)), check)
  var writes = [], expected = []
  var size = Math.floor(Math.random()*50)
  for (var i = 0; i < size; i++) {
    var n = Math.floor(Math.random()*nstreams)
    var b = Math.floor(Math.random()*49+1)
    var buf = randomBytes(b)
    writes.push([n,buf])
    expected.push({ channel: n, data: buf })
  }
  streams.forEach(function (stream,i) {
    writes.push([i,null])
  })
  ;(function next (i) {
    var w = writes[i]
    if (!w) return
    streams[w[0]].push(w[1])
    setTimeout(function () { next(i+1) }, 5)
  })(0)
  function check (err, docs) {
    t.error(err)
    t.deepEqual(docs, expected)
    cb()
  }
}

function noop () {}

function scramble (n) {
  var size = Math.floor(Math.random()*n)
  var pending = null
  return new Transform({
    transform: function transform (buf, enc, next) {
      if (pending !== null) {
        buf = Buffer.concat([pending,buf])
        pending = null
      }
      if (buf.length === size) {
        size = Math.floor(Math.random()*n)
        next(null, buf)
      } else if (buf.length > size) {
        var psize = size
        pending = buf.slice(psize)
        size = Math.floor(Math.random()*n)
        next(null, buf.slice(0,psize))
      } else {
        pending = buf
        next()
      }
    },
    flush: function (next) {
      if (pending !== null) this.push(pending)
      next()
    },
    highWaterMark: 0
  })
}
