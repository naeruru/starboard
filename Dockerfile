FROM node:12-alpine

WORKDIR /app
ADD . /app

RUN npm install
ENTRYPOINT npm start

