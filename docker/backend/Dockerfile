# syntax=docker/dockerfile:1
#
# ContribRadar BFF — マルチステージ。静的バイナリを distroless・非 root で実行。
# 現状は標準ライブラリのみの最小サーバー（外部依存なし）。

FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# distroless static: シェル/パッケージマネージャ無し・最小・攻撃面が小さい。
# :nonroot は uid 65532 で実行（USER 指定不要）。CGO_ENABLED=0 の純 Go 静的バイナリ向け。
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/server /server
EXPOSE 8080
# distroless には wget/shell が無いため、バイナリ自身の healthcheck サブコマンドで確認。
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["/server", "healthcheck"]
ENTRYPOINT ["/server"]
