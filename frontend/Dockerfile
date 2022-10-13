# docker build -f Dockerfile -t uhhlt/dwts_frontend:latest .
# docker push uhhlt/dwts_frontend:latest

# STAGE 1: BUILD REACT APP

# pull image
FROM node:lts-alpine as build

# Add a work directory
WORKDIR /app

# Set production build
ENV NODE_ENV production

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit optional --legacy-peer-deps

# Copy app files
COPY . .

# build
RUN npm run build

# STAGE 2: BUILD IMAGE
FROM nginx:stable-alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Run
CMD ["nginx", "-g", "daemon off;"]
