FROM node:0.12
MAINTAINER binux <roy@binux.me>

ADD ./ /opt/bittorrent2web
WORKDIR /opt/bittorrent2web

RUN npm install

CMD ["node", "hybrid-server.js"]
EXPOSE 8000 8900
