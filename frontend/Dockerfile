# docker build -f Dockerfile -t uhhlt/dats_frontend:<version> .
# docker push uhhlt/dats_frontend:<version>

# STAGE 1: BUILD REACT APP

# pull image
FROM node:20-alpine AS build

# Add a work directory
WORKDIR /app

# Set production build
ENV NODE_ENV production

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy app files
COPY . .

# build
RUN npm run build

# STAGE 2: BUILD IMAGE
FROM nginx:stable-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Run
CMD ["nginx", "-g", "daemon off;"]
