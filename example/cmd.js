var { exec } = require('child_process')
var { Transform } = require('readable-stream')
var mix = require('../')

if (process.argv[2] === 'pack') {
  var cmd = process.argv.slice(3).join(' ')
  var ps = exec(cmd)
  mix.pack([ ps.stdout, ps.stderr ]).pipe(process.stdout)
} else if (process.argv[2] === 'unpack') {
  var reset = '\x1b[0m'
  var color = [ '\x1b[32m', '\x1b[1m\x1b[41m\x1b[37m' ]
  process.stdin.pipe(mix.unpack(2))
    .pipe(new Transform({
      writableObjectMode: true,
      transform: function (row, enc, next) {
        next(null, reset + color[row.channel] + row.data + reset)
      }
    }))
    .pipe(process.stdout)
}
