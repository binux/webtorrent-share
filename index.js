// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<roy@binux.me>
//         http://binux.me
// Created on 2015-12-28 11:50:37

//var WebTorrent = require('webtorrent')

// https://gist.github.com/599316527/a0d1300630baa4f82aa1
var UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
var STEP = 1024;

function format(value, power) {
    return (value / Math.pow(STEP, power)).toFixed(2) + UNITS[power];
}

Vue.filter('smart-file-size', {
    read: function (value) {
        value = parseFloat(value, 10);
        for (var i = 0; i < UNITS.length; i++) {
            if (value < Math.pow(STEP, i)) {
                if (UNITS[i - 1]) {
                    return format(value, i - 1);
                }
                return value + UNITS[i];
            }
        }
        return format(value, i - 1);
    },
    write: function (value, oldValue) {
        var exp = new RegExp('^(\\d+(?:\\.\\d+)?)(' + UNITS.join('|') +')$', 'i');
        var ret = value.match(exp);
        if (ret) {
            var i = UNITS.indexOf(ret[2].toUpperCase());
            if (i >= 0) {
                return parseFloat(ret[1], 10) * Math.pow(STEP, i);
            }
        }
        return oldValue;
    }
});

var client = new WebTorrent({
  dht: false,
  tracker: true
})

var torrent = null;

var info_window = new Vue({
  el: '#app',
  data: {
    magnet: 'magnet:?xt=urn:btih:255349772d2cfe0de07173f1025900e1cc6ecfdd',
    downloaded: 0,
    downloadSpeed: 0,
    progress: 0,
    timeRemaining: 0,
    uploaded: 0,
    uploadSpeed: 0,
    numPeers: 0,
    connected: 0
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
        self.update_metric()

        $("#preview").html('')
        torrent.files.forEach(function(file) {
          file.appendTo($("#preview").get(0))
        })
      })
    },
    update_metric: function() {
      if (!torrent) {
        return
      }
      this.downloaded = torrent.downloaded
      this.downloadSpeed = torrent.downloadSpeed
      this.progress = torrent.progress
      this.timeRemaining = torrent.timeRemaining
      this.uploaded = torrent.uploaded
      this.uploadSpeed = torrent.uploadSpeed
      this.numPeers = torrent.numPeers
      this.connected = torrent.numConns
    }
  }
})

setInterval(function() { info_window.update_metric() }, 1000)
