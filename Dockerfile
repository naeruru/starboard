FROM node:14-alpine

WORKDIR /app
ADD . /app

RUN npm install
ENTRYPOINT npm start

