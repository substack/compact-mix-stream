var test = require('tape')
var mix = require('../')
var { Readable } = require('readable-stream')
var collect = require('collect-stream')

test('convert string values', function (t) {
  t.plan(2)
  var a = new Readable({ read: noop, objectMode: true })
  var b = new Readable({ read: noop, objectMode: true })
  var c = new Readable({ read: noop, objectMode: true })
  collect(mix.pack([ a, b, c ]).pipe(mix.unpack(3)), check)
  var writes = [
    [a,'AAA'],
    [b,'BBB'],
    [c,'CCC'],
    [a,'!!!'],
    [c,'o_O'],
    [b,'...'],
    [c,null],
    [a,null],
    [b,null]
  ]
  ;(function next () {
    var w = writes.shift()
    if (!w) return
    w[0].push(w[1])
    setTimeout(next,5)
  })()
  function check (err, docs) {
    t.error(err)
    t.deepEqual(docs, [
      { channel: 0, data: Buffer.from('AAA') },
      { channel: 1, data: Buffer.from('BBB') },
      { channel: 2, data: Buffer.from('CCC') },
      { channel: 0, data: Buffer.from('!!!') },
      { channel: 2, data: Buffer.from('o_O') },
      { channel: 1, data: Buffer.from('...') }
    ])
  }
})

function noop () {}
