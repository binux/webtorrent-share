FROM node
MAINTAINER binux <roy@binux.me>

RUN apt-get update &&\
    apt-get install -y libgtk2.0-0 libgconf-2-4 \
    libasound2 libxtst6 libxss1 libnss3 xvfb libnotify4

ADD ./ /opt

WORKDIR /opt
RUN npm install .

ENTRYPOINT ["node", "app.js"]

EXPOSE 3333
