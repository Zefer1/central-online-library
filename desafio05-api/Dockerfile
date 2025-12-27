FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

# Note: DB migrations are handled by the app's startup (ensureDatabase + migrations/seed)
CMD ["node", "index.js"]
