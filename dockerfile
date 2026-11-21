FROM nginx:alpine
# پوشه build یا dist را به مسیر پیش‌فرض nginx کپی می‌کنیم
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
