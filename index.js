// vim: set et sw=2 ts=2 sts=2 ff=unix fenc=utf8:
// Author: Binux<roy@binux.me>
//         http://binux.me
// Created on 2015-12-28 11:50:37

(function(){
  'use strict';
  //var Vue = require('vue')
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

  function renderTo(file, elem, cb) {
    if (typeof elem === 'string') elem = document.querySelector(elem)
    var infohash = file._torrent && file._torrent.infoHash

    if (config.danmu_server && file.name.match(/.(mp4|m4v|webm|mkv)$/i)) {
      var room = new Wilddog(`${config.danmu_server}/${infohash}`)
      var danmu_ready = false
      var video_ready = false

      // video
      var inst = ABP.create(elem, {
      });
      window.inst = inst

      // load danmu
      inst.createPopup("loading danmu...")
      room.once('value', function(snap) {
        var my_post = null
        var keys = Object.keys(snap.val() || {});
        var lastIdInSnapshot = keys[keys.length-1]

        var data = []
        snap.forEach(function(s) {
          data.push(s.val())
        })
        inst.cmManager.load(data)

        danmu_ready = true
        inst.removePopup()
        inst.createPopup("danmu loaded", 2000)
        if (video_ready) {
          inst.cmManager.startTimer()
        }

        var query = room.orderByKey()
        if (lastIdInSnapshot) {
          query = query.startAt(lastIdInSnapshot)
        }
        query.on("child_added", function(snap) {
          if(snap.key() === lastIdInSnapshot) { return }
          var data = snap.val()

          if (data.text == my_post) {
            data.border = true
            inst.cmManager.send(data)
          } else if (Math.abs(inst.video.currentTime * 1000 - data.stime) < 10000) {
            inst.cmManager.send(data)
          } else {
            inst.cmManager.insert(data)
          }
        })

        // send danmu
        inst.txtText.addEventListener('keypress', function(e) {
          if (e.keyCode != 13) {
            return
          }

          var data = {
            mode: 1,
            stime: parseInt(inst.video.currentTime * 1000), 
            text: inst.txtText.value.trim()
          }
          if (!!!data.text) {
            return
          }

          my_post = data.text
          room.push(data, function(err) {
            if (err) {
              inst.createPopup('send danmu error: ' + err, 3000)
            } else {
              inst.txtText.value = ''
            }
          })
        })
      })

      inst.video.addEventListener('loadedmetadata', function() {
        document.querySelector('#video-view .ABP-Unit').style.width = '' + inst.video.videoWidth + 'px'
        document.querySelector('#video-view .ABP-Unit').style.height = '' + (inst.video.videoHeight + inst.txtText.clientHeight + inst.barHitArea.clientHeight) + 'px'
        document.querySelector('#video-view .ABP-Video video').controls = true;
        inst.cmManager.setBounds()
      })

      inst.video.addEventListener('play', function() {
        inst.btnPlay.className = "button ABP-Play ABP-Pause"
      })

      inst.video.addEventListener('playing', function() {
        video_ready = true
        if (danmu_ready) {
          inst.cmManager.startTimer()
        }
      })

      inst.video.addEventListener('pause', function() {
        inst.btnPlay.className = "button ABP-Play"
      })

      file.renderTo(inst.video, cb)
    } else {
      file.appendTo(elem, cb)
    }
  }

  // webtorrent client
  var client = new WebTorrent
  //window.client = client
  var config = {
    "announce": [
      "wss://tracker.webtorrent.io",
      "wss://tracker.btorrent.xyz",
      "wss://tracker.openwebtorrent.com",
      "wss://tracker.fastcast.nz"
    ]
  }

  // app
  var App = Vue.extend({
    data: function() {
      return {
        client: client,
        glob: null
      }
    },
    init: function() {
      this.$http.get('/config').then(function(response) {
        config = response.data
        this.$set('glob', response.data.glob)
        document.title = response.data.glob
      })
    }
  })

  // filelist
  var Filelist = Vue.extend({
    template: '#filelist-template',
    data: function() {
      return {
        files: [],
      }
    },
    init: function() {
      this.$http.get('/files').then(function(response) {
        this.$set('files', response.data.files)
      })
    },
  })

  // video view
  var Video = Vue.extend({
    template: '#video-template',
    data: function() {
      return {
        infohash: null,
        torrent: null,
        downloadSpeed: 0, // it's a getter in torrent, which cannot update UI
        uploadSpeed: 0,
        timeRemaining: 0/0,
        download_link: null,
      }
    },
    init: function() {
      var self = this;
      var infohash = this.$route.params.infohash
      this.$set('infohash', infohash)
      client.add(`${location.origin}/torrent/${infohash}`, {
        announce: config.announce,
      }, (torrent) => {
        self.$set('torrent', torrent)
        document.title = torrent.files[0].name

        renderTo(torrent.files[0], '#video-view', function(err) {
          if (err) console.error(err)
        })
        torrent.on('download', () => {
          self.$set('downloadSpeed', torrent.downloadSpeed)
          self.$set('timeRemaining', torrent.timeRemaining)
        })
        torrent.on('upload', () => {
          self.$set('uploadSpeed', torrent.uploadSpeed)
        })
        torrent.on('done', () => {
          torrent.files[0].getBlobURL((err, url) => {
            self.$set('download_link', url)
          })
        })
      })
    },
    beforeDestroy: function () {
      client.torrents.forEach(function(torrent) {
        torrent.destroy()
      })
    }
  })

  // router
  var router = new VueRouter()
  router.map({
    '/': {
      component: Filelist,
    },
    '/v/:infohash': {
      name: 'video',
      component: Video
    }
  })

  router.start(App, '#app')
})();
