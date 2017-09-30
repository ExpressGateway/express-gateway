FROM node:alpine

ARG VERSION
ARG TYPE=basic

ENV NODE_ENV production
# this will enable polling, hot-reload will work on docker or network volumes
ENV CHOKIDAR_USEPOLLING true 

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install express-gateway@$VERSION && \
    ./node_modules/.bin/eg gateway create -n gateway -d . -t $TYPE && \
    npm cache clean --force

EXPOSE 8080

# HTTPS
# EXPOSE 8443 

# Admin API
# EXPOSE 9876 
CMD [ "npm", "run", "start" ]
