FROM node:latest

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
EXPOSE 8080

# HTTPS
# EXPOSE 8443 

# Admin API
# EXPOSE 9876 
CMD [ "npm", "run", "start" ]


