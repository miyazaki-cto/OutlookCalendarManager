FROM node:18

WORKDIR /usr/src/app

# package.json and package-lock.json are copied first to leverage Docker cache
COPY package*.json ./

RUN npm install

# Copy the rest of the application
COPY . .

# Set permissions for node user
RUN chown -R node:node /usr/src/app

USER node

EXPOSE 3000

# Start the dev server
CMD ["npm", "run", "dev-server"]
