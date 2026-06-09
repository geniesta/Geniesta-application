# syntax=docker/dockerfile:1
#
# ContribRadar Redis — ホットキャッシュ。設定ファイルを焼き込み永続化を無効化。
FROM redis:7-alpine

COPY redis.conf /usr/local/etc/redis/redis.conf

EXPOSE 6379
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
