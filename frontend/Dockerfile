FROM nginx:alpine

# 複製所有前端文件到 Nginx 服務目錄
COPY . /usr/share/nginx/html/

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
