FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source and build
COPY . .
RUN npx prisma generate && npm run build

# Production
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
