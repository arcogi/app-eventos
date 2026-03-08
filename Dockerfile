# Stage 1: Build the Monorepo (Web and Admin Apps)
FROM node:18-alpine AS build
WORKDIR /app

# Configure NPM workspace tree
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/admin/package*.json ./apps/admin/
COPY server/package*.json ./server/

# Install dependencies root-down
RUN npm install

# Copy all local source files into builder image
COPY . .

# Build React applications (creates apps/web/dist and apps/admin/dist)
# During build time, VITE_API_URL should be relative so the production React app hits the same origin
ENV VITE_API_URL=""
RUN npm run build --workspace=apps/web
RUN npm run build --workspace=apps/admin

# Stage 2: Production Execution Environment
FROM node:18-alpine
WORKDIR /app

# Only grab dependencies needed for running the Express serve
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/admin/package*.json ./apps/admin/
COPY server/package*.json ./server/
RUN npm install --omit=dev --workspace=server

# Copy server code
COPY server ./server

# Copy compiled React artifacts from Stage 1 into the running express environment
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/admin/dist ./apps/admin/dist

# The Node app listens on 3001
EXPOSE 3001

# Fire up Express API layer and static file provider
CMD ["node", "server/index.js"]
