var { Readable, Transform } = require('readable-stream')
var onend = require('end-of-stream')
var varint = require('varint')

exports.pack = function (streams) {
  var lsh = ilg2(streams.length-1) + 1
  var closed = {}
  var open = streams.length
  streams.forEach(function (stream, i) {
    closed[i] = false
    onend(stream, function () {
      closed[i] = true
      if (--open === 0) output.push(null)
    })
    stream.on('readable', function () {
      if (qsize !== null) {
        var qsize_ = qsize
        qsize = null
        read(qsize_)
      }
    })
  })
  var bqueue = []
  var iqueue = []
  var qnext = null, qsize = null
  var output = new Readable({ read })
  var resume = 0
  return output

  function read (size) {
    if (bqueue.length > 0) {
      return write(bqueue.shift(), iqueue.shift())
    }
    var sent = 0
    for (var j = 0; j < streams.length; j++) {
      var i = (j + resume) % streams.length
      if (closed[i]) continue
      var buf = streams[i].read()
      if (buf !== null && sent === 0) {
        sent++
        write(buf, i)
        break
      } else if (buf !== null) {
        sent++
        bqueue.push(buf)
        iqueue.push(i)
        break
      }
    }
    if (sent === 0) {
      qsize = size
    }
  }
  function write (buf, i) {
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf)
    resume = i+1
    var n = (buf.length << lsh) + i
    var nbuf = Buffer.from(varint.encode(n))
    output.push(Buffer.concat([nbuf,buf]))
  }
}

exports.unpack = function (n) {
  var rsh = ilg2(n-1) + 1
  var pending = { data: null, length: 0, channel: -1 }
  return new Transform({
    readableObjectMode: true,
    transform: function (buf, enc, next) {
      if (pending.data !== null) {
        buf = Buffer.concat([pending.data,buf])
        pending.data = null
      }
      if (pending.length > 0 && buf.length === pending.length) {
        pending.length = 0
        return next({ channel: pending.channel, data: buf })
      } else if (pending.length > 0 && buf.length < pending.length) {
        var doc = {
          channel: pending.channel,
          data: buf.slice(0,pending.length)
        }
        pending.length = 0
        buf = buf.slice(pending.length)
        this.push(doc)
      } else if (pending.length > 0) {
        return next()
      }
      try { var x = varint.decode(buf) }
      catch (err) {
        pending.data.push(buf)
        return next()
      }
      var xlen = varint.decode.bytes
      var len = x >> rsh
      var channel = x & ((1<<rsh)-1)
      if (xlen + len == buf.length) {
        next(null, { channel, data: buf.slice(xlen) })
      } else if (xlen + len > buf.length) {
        next(null, { channel, data: buf.slice(xlen,xlen+len) })
      } else if (xlen + len < buf.length) {
        pending.data = buf.slice(xlen)
        pending.length = len
        pending.channel = channel
        next()
      }
    }
  })
}

function ilg2 (x) { return 31-Math.clz32(x) }
