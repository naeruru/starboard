FROM node:16-alpine

WORKDIR /app
ADD . /app

RUN npm install
ENTRYPOINT npm start

