# syntax=docker/dockerfile:1
#
# ContribRadar PostgreSQL — 公式イメージを継承したプロジェクト固有 DB イメージ。
# スキーマ適用は golang-migrate（compose の migrate サービス）が担うため、
# ここでは拡張・ロケール・チューニング等の土台のみを定義する。
FROM postgres:18-alpine

# タイムゾーン/ロケールはアプリ非依存。必要に応じて拡張をここに追加する。
# 例: RUN apk add --no-cache postgresql-contrib

# 初期化 SQL を投入したい場合は /docker-entrypoint-initdb.d/ に COPY する。
# （初回起動・空データボリューム時のみ実行される）
# COPY ./initdb/ /docker-entrypoint-initdb.d/

EXPOSE 5432
