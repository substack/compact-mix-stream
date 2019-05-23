# compact-mix-stream

combine multiple streams (for example stdout and stderr) into a single output
stream and reconstruct the input streams from the packed output

This module is useful for storing stderr and stdout from a process in a way
where the output can be rendered later with custom ansi colors or html elements.

# example

The following program executes a shell command following `pack` and writes the
compact mix data from stderr and stdout in the child process to stdout.

This mix data can be read from stdin with the `unpack` command and rendered
green for stdout and red background with bold white text for stderr.

``` js
var { exec } = require('child_process')
var { Transform } = require('readable-stream')
var mix = require('compact-mix-stream')

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
```

For example, you should see the following output when piping the output from the
pack command into the unpack command, but properly colorized in your terminal:

```
$ node example/cmd.js pack 'cal; ls /does-not-exist; sleep 0.1; date' \
| node example/cmd.js unpack
      May 2019        
Su Mo Tu We Th Fr Sa  
          1  2  3  4  
 5  6  7  8  9 10 11  
12 13 14 15 16 17 18  
19 20 21 22 23 24 25  
26 27 28 29 30 31     
                      
ls: cannot access '/does-not-exist': No such file or directory
Thu May 23 22:03:23 CEST 2019
```

# compactness

A shift factor is calculated from the number of input streams to `pack()` or
from the argument number of streams to `unpack()`. The shift factor is the
integer log base 2 of the (number of streams minus 1) plus one.

The data from input streams arrives in chunks. The chunk length is left shifted
by the shift factor and added to the channel index. This sum is written inline
to the output as a [varint][].

Most of the time this value will only be 2 or 3 bytes of overhead per chunk.

[varint]: https://www.npmjs.com/package/varint

# api

``` js
var mix = require('compact-mix-stream')
```

## var rstream = mix.pack(streams)

Pack output from an array of binary `streams` into a readable stream of binary
output `rstream`. The order of elements in `streams` determines the integer
`channel` index in the unpacked object stream.

## var stream = mix.unpack(nstreams)

Unpack output created by `mix.pack()` for `nstreams` number of streams.
The writable side of `stream` is the data from `mix.pack()` and the readable
side is an object stream of rows where each `row` has:

* `row.channel` - integer index of the generating stream from packing
* `row.data` - Buffer of data payload from the stream

The size of chunks received by `mix.pack()` is preserved in the size of
`row.data`.

# install

```
npm install compact-mix-stream
```

# license

BSD
