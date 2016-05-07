share files via webtorrent network
==================================

通过 [WebTorrent] 分享视频/文件

share files via [WebTorrent]


Features
--------

* 通过 [WebTorrent] P2P 地分享文件
* **视频边下边播，支持弹幕！**
* 自动检测文件添加删除变动


* Share files via [WebTorrent] p2p network.
* Video streaming with [danmu](https://en.wikipedia.org/wiki/Bilibili#Features)!!
* Watch files add/change/remove on specified path.


Usage
-----

```
npm install binux/webtorrent-share -g
webtorrent-share [options] [glob]

--port                      port of service
--danmu_server              a [wilddog](https://www.wilddog.com/) (realtime message storage & push service) endpoint

```

默认会分享当前目录下的所有文件，你可以通过例如 `webtgorrent-share '/downloads/**/*.mp4'` 来指定分享 downloads 目录以及所有下级目录中的 mp4 文件

It will share every files in current path `./*` by default, you can specify the files by glob pattern:  
e.g. `webtgorrent-share '/downloads/**/*.mp4'` which means every mp4 in zero or more subdirectores under downloads folder.


License
-------
MIT


[WebTorrent]:           https://github.com/feross/webtorrent
