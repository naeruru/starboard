FROM node:20-alpine

WORKDIR /app
ADD . /app

RUN npm install
ENTRYPOINT npm start

