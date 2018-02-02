FROM node:8-alpine

LABEL maintainer Vincenzo Chianese, vincenzo@express-gateway.io

ENV EG_VERSION 1.7.1
ENV NODE_ENV production
# Enable chokidar polling so hot-reload mechanism can work on docker or network volumes
ENV CHOKIDAR_USEPOLLING true

RUN npm install express-gateway@$EG_VERSION

WORKDIR /node_modules/express-gateway

EXPOSE 8080 9876

CMD [ "node", "lib", "index.js" ]
