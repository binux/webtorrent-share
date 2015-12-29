// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<roy@binux.me>
//         http://binux.me
// Created on 2015-12-28 11:29:01

var Server = require('bittorrent-tracker').Server
var WebTorrent = require('webtorrent-hybrid')
global.WEBTORRENT_ANNOUNCE = ["ws://127.0.0.1:8900/announce"]
//global.WEBTORRENT_ANNOUNCE = [ 'wss://tracker.webtorrent.io', 'wss://tracker.btorrent.xyz' ]

var client = new WebTorrent({
  dht: false,
  tracker: true
})

client.on('torrent', function(torrent) {
  console.log('added torrent: ' + torrent.magnetURI)
  // select pieces in file streaming order
  torrent.critical(0, Math.min(10, torrent.pieces.length - 1))
  for (var i = 10; i < torrent.pieces.length - 1; i += 10) {
    torrent.select(i, Math.min(i + 10, torrent.pieces.length - 1), torrent.pieces.length / 10 - i / 10)
  }
  torrent.on('wire', function(wire, addr) {
    console.log('new wire: ' + addr)
  })
  torrent.on('download', function(chunkSize){
    //console.log('progress: ' + torrent.progress);
  })
})

var server = new Server({
  udp: false,
  http: true,
  ws: true,
  filter: function(info_hash, params, cb) {
    // add to web torrent client here
    console.log('adding torrent: ' + info_hash)
    client.add(info_hash, {
      announce: ["https://tr.bangumi.moe:9696/announce", "http://tr.bangumi.moe:6969/announce", "http://127.0.0.1:8900/announce"]
    })
    cb(true)
  }
})

server.on('error', function (err) {
  // fatal server error!
  console.log(err.message)
})

server.on('warning', function (err) {
  // client sent bad data. probably not a problem, just a buggy client.
  console.log(err.message)
})

server.on('listening', function () {
  // fired when all requested servers are listening
  console.log('listening on http port:' + server.http.address().port)
})

server.listen(8900, '0.0.0.0')

server.on('start', function (addr) {
  console.log('got start message from ' + addr)
})
server.on('complete', function (addr) {
  console.log('got complete message from ' + addr)
})
server.on('update', function (addr) {
  console.log('got update message from ' + addr)
})
server.on('stop', function (addr) {
  console.log('got stop message from ' + addr)
})
