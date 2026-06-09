FROM nginx:1.27.5-alpine

ENV TZ=Asia/Tokyo

# build context = docker/nginx/ なので直接コピー
COPY ./default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
