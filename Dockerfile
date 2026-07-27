FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY package*.json ./
RUN npm install && cd server && npm install && cd ../client && npm install
COPY . .
RUN cd client && npm run build
EXPOSE 3002
CMD ["node", "server/index.js"]
