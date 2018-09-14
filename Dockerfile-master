FROM node:8-alpine

ENV NODE_ENV production

# Enable chokidar polling so hot-reload mechanism can work on docker or network volumes
ENV CHOKIDAR_USEPOLLING true

WORKDIR /usr/src/app

COPY package.json package-lock.json /usr/src/app/
RUN npm install

EXPOSE 8080 9876

CMD [ "node", "lib", "index.js" ]

COPY . /usr/src/app
