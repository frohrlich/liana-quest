FROM node:22

COPY . .

RUN npm install && npm run build
EXPOSE 8080

CMD [ "npm", "start" ]