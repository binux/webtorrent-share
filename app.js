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

	var database = {}

  function store_database() {
    fs.writeFileSync('database.json', JSON.stringify(database))
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
  glob(config.glob, (er, files) => {
    if (er) {
      console.error(er);
      process.exit(1);
    }

    //files = files.slice(0, 1)
    files.forEach((file) => {
      if (!fs.statSync(file).isFile()) {
        return
      }

      createTorrent(file, {
        announceList: config.announce,
      }, (err, torrent) => {
        torrent = parseTorrent(torrent)
        console.log(`seeding ${file} ${torrent.infoHash}`)

        database[torrent.infoHash] = {
          file: file,
          torrent: torrent,
        }
        store_database()
      })
    })
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
