# docker build -f Dockerfile -t uhhlt/dwts_frontend:latest .
# docker run -p 80:80 uhhlt/dwts_frontend:latest
# docker push uhhlt/dwts_frontend:latest

# STAGE 1: BUILD REACT APP

# pull image
FROM node:17-alpine as build

# Add a work directory
WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --force --silent

# Copy app files
COPY . .

# build
RUN npm run build

# STAGE 2: BUILD IMAGE
FROM nginx:stable-alpine

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy config files
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Run
CMD ["nginx", "-g", "daemon off;"]
