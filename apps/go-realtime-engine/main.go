package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/livekit/protocol/auth"
)

// Helper to return pointer to bool
func ptr(b bool) *bool {
	return &b
}

func getToken(w http.ResponseWriter, r *http.Request) {
	apiKey := os.Getenv("LIVEKIT_API_KEY")
	apiSecret := os.Getenv("LIVEKIT_API_SECRET")

	if apiKey == "" || apiSecret == "" {
		http.Error(w, "LiveKit credentials not configured", http.StatusInternalServerError)
		return
	}

	room := r.URL.Query().Get("room")
	user := r.URL.Query().Get("user")

	if room == "" || user == "" {
		http.Error(w, "room and user are required query parameters", http.StatusBadRequest)
		return
	}

	at := auth.NewAccessToken(apiKey, apiSecret)
	grant := &auth.VideoGrant{
		RoomJoin:     true,
		Room:         room,
		CanPublish:   ptr(true),
		CanSubscribe: ptr(true),
	}
	at.AddGrant(grant).
		SetIdentity(user).
		SetValidFor(time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		http.Error(w, "failed to generate token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return as plain text
	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprint(w, token)
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight request
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	http.HandleFunc("/health", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status": "ok", "service": "go-realtime-engine"}`)
	}))

	http.HandleFunc("/get-token", corsMiddleware(getToken))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Go realtime engine listening on http://0.0.0.0:%s (accessible via LAN IP)\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
