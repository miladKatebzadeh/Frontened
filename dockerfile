FROM node:20-alpine
WORKDIR /app

# کپی کردن فایل‌های پکیج و نصب وابستگی‌های تولید (production)
COPY package*.json ./
RUN npm ci --only=production

# کپی کردن خروجی بیلد Next.js و فایل‌های تنظیمات
COPY .next ./.next
COPY next.config.mjs ./
# اگر پوشه public در پروژه دارید خط زیر را از حالت کامنت خارج کنید:
# COPY public ./public

EXPOSE 3000
CMD ["npm", "start"]
