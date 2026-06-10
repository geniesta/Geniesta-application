// BFF — 暫定の最小サーバー（hello world）。
//
// 本格実装（gqlgen + ent + GitHub アダプタ + スコアリング）は
// backup/full-bff ブランチに退避済み。復元は:
//   git checkout backup/full-bff -- backend
//
// 標準ライブラリのみ。外部依存・DB・Redis なし。
package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	// distroless（シェル/wget なし）でも HEALTHCHECK できるよう、
	// `server healthcheck` で /healthz を叩いて 0/1 を返すサブコマンドを提供する。
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		runHealthcheck()
		return
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("hello world\n"))
	})

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("bff (hello world) listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

// runHealthcheck は HEALTHCHECK 用。/healthz に GET し、200 なら exit 0、それ以外は exit 1。
func runHealthcheck() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		os.Exit(1)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		os.Exit(1)
	}
}
