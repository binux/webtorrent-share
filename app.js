/*
 * app.js
 * Copyright (C) 2016 Binux <roy@binux.me>
 *
 * Distributed under terms of the MIT license.
 */
(function(){
  'use strict';

  //var Xvfb = require('xvfb')
  //var xvfb = new Xvfb()
  //xvfb.startSync()
  
  var os = require('os')
  var fs = require('fs')
  var path = require('path')
  var glob = require('glob')
  var createTorrent = require('create-torrent')
  var parseTorrent = require('parse-torrent')
  var argv = require('minimist')(process.argv.slice(2))
  var watch = require('gulp-watch')
  var debounce = require('debounce')

	var database = {}

  try {
    var database_cache = JSON.parse(fs.readFileSync('database.json'))
  } catch(e) {
    //console.error(e)
    var database_cache = {}
  }

  function store_database() {
    var database_cache = {}
    for (let k in database) {
      database_cache[database[k].file] = parseTorrent.toTorrentFile(database[k].torrent)
    }
    fs.writeFileSync('database.json', JSON.stringify(database_cache))
  }

  // env check
  //if (!!!WebTorrent.WEBRTC_SUPPORT) {
    //console.error('no webrtc support');
    //process.exit(1);
  //}

  var config = JSON.parse(fs.readFileSync('config.json'))
  if (argv['_'] && argv['_'].length)
    config.glob = argv['_'][0]
  for (var k in argv)
    config[k] = argv[k]

  console.log(config)

  // seeding
  function seed(file) {
    if (!fs.statSync(file).isFile()) {
      return
    }

    if (database_cache[file] !== undefined) {
      var torrent = parseTorrent(new Buffer(database_cache[file]))
      console.log(`reloaded ${file} ${torrent.infoHash}`)

      database[torrent.infoHash] = {
        file: file,
        torrent: torrent
      }
      store_database()
    } else {
      createTorrent(file, {
        announceList: config.announce,
      }, (err, torrent) => {
        var torrent = parseTorrent(torrent)
        console.log(`seeding ${file} ${torrent.infoHash}`)

        database[torrent.infoHash] = {
          file: file,
          torrent: torrent,
        }
        store_database()
      })
    }
  }

  glob(config.glob, (er, files) => {
    if (er) {
      console.error(er);
      process.exit(1);
    }

    //files = files.slice(0, 1)
    files.forEach(seed)
  })

  // watch
  var file_debounce = {}
  watch(config.glob, {
    events: ['add', 'change', 'unlink'],
  }, (event) => {
    if (event.event == 'add') {
      file_debounce[event.path] = debounce(seed, 10 * 1000)
      file_debounce[event.path](event.path)
    } else if (event.event == 'change') {
      if (file_debounce[event.path])
        file_debounce[event.path](event.path)
    } else if (event.event == 'unlink') {
      var deleted = false
      for (let k in database) {
        var v = database[k]
        if (v.file == event.path) {
          console.log(`remove ${v.file} ${v.torrent.infoHash}`)
          delete database[k]
          deleted = true
        }
      }
      if (deleted) {
        store_database()
      }
    }
  })

  // HTTP server
  var express = require('express')
  var app = express()

  app.use(express.static('./'))

  app.get('/files', (req, res) => {
    var files = []
    for (let file in database) {
      var torrent = database[file].torrent
      files.push({
        name: torrent.name,
        length: torrent.length,
        infoHash: torrent.infoHash,
      })
    }

    res.json({
      files: files,
    })
  })

  app.get('/torrent/:infoHash', (req, res) => {
    var infoHash = req.params.infoHash
    if (database[infoHash] === undefined) {
      res.sendStatus(404)
      return
    }

    var torrent = database[infoHash].torrent
    torrent.urlList = [
      `${req.protocol}://${req.headers.host}/file/${infoHash}`
    ]
    var torrent_file = parseTorrent.toTorrentFile(torrent)

    res.set('Content-Type', 'application/x-bittorrent')
    res.send(torrent_file)
  })

  app.get('/file/:infoHash', (req, res) => {
    var infoHash = req.params.infoHash
    if (database[infoHash] === undefined) {
      res.sendStatus(404)
      return
    }

    res.sendFile(database[infoHash].file)
  })

  app.get('/config', (req, res) => {
    res.json(config)
  })

  app.listen(config.port, () => {
    console.log(`listening on port ${config.port}`)
  })
})();
