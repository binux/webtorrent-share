#!/usr/bin/env node
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
  var watch = require('chokidar')
  var debounce = require('debounce')

	var database = {}

  try {
    var database_cache = JSON.parse(fs.readFileSync(path.resolve(os.tmpdir(), 'database.json')))
  } catch(e) {
    //console.error(e)
    var database_cache = {}
  }

  function store_database() {
    var database_cache = {}
    for (let k in database) {
      database_cache[database[k].file] = parseTorrent.toTorrentFile(database[k].torrent)
    }
    fs.writeFileSync(path.resolve(os.tmpdir(), 'database.json'), JSON.stringify(database_cache))
  }

  // env check
  //if (!!!WebTorrent.WEBRTC_SUPPORT) {
    //console.error('no webrtc support');
    //process.exit(1);
  //}

  var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'config.json')))
  if (argv['_'] && argv['_'].length)
    config.glob = argv['_'][0]
  for (var k in argv)
    config[k] = argv[k]

  console.log(config)

  // seeding
  function seed(file) {
    file = path.resolve(file)
    if (!fs.statSync(file).isFile()) {
      return
    }
    try {
      if (fs.statSync(file+'.aria2').isFile()) {
        return
      }
    } catch(e) {
    }

    if (database_cache[file] !== undefined) {
      var torrent = parseTorrent(new Buffer(database_cache[file]))
      console.log(`reloaded ${file} ${torrent.infoHash}`)

      database[torrent.infoHash] = {
        file: file,
        torrent: torrent
      }
    } else {
      createTorrent(file, {
        announceList: config.announce,
      }, (err, torrent) => {
        var torrent = parseTorrent(torrent)
        console.log(`seeding ${file} ${torrent.infoHash}`)

        // remove old item when file changed
        for (let k in database) {
          if (database[k].file == file)
            delete database[k]
        }

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
    store_database()
    database_cache = {}
  })

  // watch
  var file_debounce = {}
  watch.watch(config.glob, {
    persistent: false,
    ignoreInitial: true,
    awaitWriteFinish: true,
  })
  .on('add', path => {
    if (!file_debounce[path])
      file_debounce[path] = debounce(seed, 30 * 1000)
    file_debounce[path](path)
  })
  .on('change', path => {
    if (!file_debounce[path])
      file_debounce[path] = debounce(seed, 30 * 1000)
    file_debounce[path](path)
  })
  .on('unlink', path => {
    var deleted = false
    for (let k in database) {
      var v = database[k]
      if (v.file == path) {
        console.log(`remove ${v.file} ${v.torrent.infoHash}`)
        delete database[k]
        deleted = true
      }
    }
    if (deleted) {
      store_database()
    }
  })

  // HTTP server
  var express = require('express')
  var cookieParser = require('cookie-parser')
  var app = express()

  app.use(express.static(__dirname))
  app.use(cookieParser(config.glob))

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

    res.cookie('torrent', infoHash, { httpOnly: true, signed: true })
    res.set('Content-Type', 'application/x-bittorrent')
    res.send(torrent_file)
  })

  app.get('/file/:infoHash', (req, res) => {
    var infoHash = req.params.infoHash
    if (database[infoHash] === undefined) {
      res.sendStatus(404)
      return
    }
    if (!req.headers.range || !req.signedCookies.torrent) {
      res.sendStatus(403)
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
