# Use Node LTS
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the project
COPY . .

# Expose your backend port (change if needed)
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]