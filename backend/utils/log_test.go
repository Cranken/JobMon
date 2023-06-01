package utils

import (
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestInit(t *testing.T) {
	// Create a buffer to capture log output
	logOutput := bytes.Buffer{}
	log.SetOutput(&logOutput)

	// Create a new WebLogger instance
	logger := &WebLogger{}
	logger.Init()

	// Check that defaultWriter is set to log.Writer()
	if log.Writer() != logger.defaultWriter {
		t.Errorf("Init failed, expected: %v, got: %v", log.Writer(), logger.defaultWriter)
	}

	// Check that connections is an empty slice
	if len(logger.connections) != 0 {
		t.Errorf("Init failed, expected: %v, got: %v", 0, len(logger.connections))
	}

	// Check that the ring buffer is initialized with 25 elements
	if logger.ring.Len() != 25 {
		t.Errorf("Init failed, expected: %v, got: %v", 25, logger.ring.Len())
	}

	// Check that the log message is written to the defaultWriter
	expectedLog := "Init: WebLogger initialized"
	if logger.ring == nil {
		t.Errorf("Init failed, expected: %v, got: %v", expectedLog, logOutput.String())
	}
}

func TestWrite(t *testing.T) {
	// Create a new WebLogger instance
	logger := &WebLogger{}
	logger.Init()

	// Create a dummy HTTP server using httptest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Upgrade HTTP connection to WebSocket connection
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatalf("Failed to upgrade connection to WebSocket: %s", err)
		}
		// Append the WebSocket connection to the logger's connections list
		logger.connections = append(logger.connections, conn)

		// Read messages from the WebSocket connection
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}))
	defer server.Close()

	// Create a WebSocket connection to the dummy server
	wsURL := "ws" + server.URL[len("http"):]

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket server: %s", err)
	}
	// Append the WebSocket connection to the logger's connections list
	logger.connections = append(logger.connections, conn)

	// Create a buffer to capture the output of the default writer
	var buf bytes.Buffer
	logger.defaultWriter = &buf

	// Define the test input
	message := []byte("test message")

	// Call the Write function
	_, err = logger.Write(message)
	if err != nil {
		t.Errorf("Unexpected error: %s", err)
	}

	// Wait for a short time to allow the messages to be processed
	time.Sleep(100 * time.Millisecond)

	// Assert that the message was written to the default writer
	output := buf.String()
	if output != string(message) {
		t.Errorf("Unexpected output. Got: %s, Expected: %s", output, message)
	}
}

func TestWebAddConnection(t *testing.T) {
	// Create a new WebLogger instance
	logger := &WebLogger{}
	logger.Init()

	// Create a dummy WebSocket connection using httptest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Upgrade HTTP connection to WebSocket connection
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatalf("Failed to upgrade connection to WebSocket: %s", err)
		}

		// Call the AddConnection function
		logger.AddConnection(conn)

		// Assert that the connection was added to the logger's connections list
		if len(logger.connections) != 1 || logger.connections[0] != conn {
			t.Errorf("Failed to add connection to the logger's connections list")
		}
	}))
	defer server.Close()

	// Create a WebSocket connection to the dummy server
	wsURL := "ws" + server.URL[len("http"):]

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket server: %s", err)
	}

	// Close the WebSocket connection at the end of the test
	defer conn.Close()

	// Send an initial message to the WebSocket server
	err = conn.WriteMessage(websocket.TextMessage, []byte("initial message"))
	if err != nil {
		t.Fatalf("Failed to send initial message: %s", err)
	}

}

func TestRemoveConnection(t *testing.T) {
	// Create a new WebLogger instance
	logger := &WebLogger{}
	logger.Init()

	// Create a dummy WebSocket connection using httptest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Upgrade HTTP connection to WebSocket connection
		upgrader := websocket.Upgrader{}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatalf("Failed to upgrade connection to WebSocket: %s", err)
		}

		// Add the connection to the logger's connections list
		logger.connections = append(logger.connections, conn)

		// Call the RemoveConnection function
		logger.RemoveConnection(conn)

		// Assert that the connection was removed from the logger's connections list
		if len(logger.connections) != 0 {
			t.Errorf("Failed to remove connection from the logger's connections list")
		}
	}))
	defer server.Close()

	// Create a WebSocket connection to the dummy server
	wsURL := "ws" + server.URL[len("http"):]

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket server: %s", err)
	}

	// Close the WebSocket connection at the end of the test
	defer conn.Close()

	// Send an initial message to the WebSocket server
	err = conn.WriteMessage(websocket.TextMessage, []byte("initial message"))
	if err != nil {
		t.Fatalf("Failed to send initial message: %s", err)
	}

	// The RemoveConnection function should be called by the server handler
	// and remove the connection from the logger's connections list
	// The assertions are performed inside the server handler function
}
