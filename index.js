// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<roy@binux.me>
//         http://binux.me
// Created on 2015-12-28 11:50:37

var WebTorrent = require('webtorrent')

var client = new WebTorrent()

var torrent = null;

var info_window = new Vue({
  el: '#app',
  data: {
    magnet: 'magnet:?xt=urn:btih:49ade54fca88b2a1941540f5aba7a0a4cf5f3861',
  },
  methods: {
    go: function() {
      var self = this

      if (torrent) {
        torrent.destroy()
      }

      client.add(self.magnet, {
        announce: ['ws://'+window.location.hostname+':8900/announce']
      }, function(t) {
        torrent = t
        torrent.on('download', function(chunk_size) {
          self.downloaded = torrent.downloaded
          self.downloadSpeed = torrent.downloadSpeed()
          self.progress = torrent.progress
          self.timeRemaining = torrent.timeRemaining
          self.uploaded = torrent.uploaded
          self.uploadSpeed = torrent.uploadSpeed()
          self.numPeers = torrent.numPeers
          self.connected = torrent.swarm.numConns
        })

        torrent.files.forEach(function(file) {
          file.appendTo($("#preview").get(0));
        })
      })
    }
  }
})
