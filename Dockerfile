# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Copy package files specifically from the backend folder
COPY backend/package*.json ./
RUN npm install

# Stage 2: Build stage (if you have transpilation or assets)
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Copy the entire backend source code
COPY backend/ .
# If your package.json contains a build step, uncomment the line below:
# RUN npm run build

# Stage 3: Final Production Image
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy modules, package settings, and the server folder (which contains your index.js!)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/package*.json ./

EXPOSE 4000
# Boots up using the index.js inside your backend root
CMD ["node", "server/index.js"]