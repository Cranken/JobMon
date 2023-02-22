package utils

import (
	"container/ring"
	"fmt"
	"io"
	"log"

	"github.com/gorilla/websocket"
)

type WebLogger struct {
	// Writer to default error log
	defaultWriter io.Writer
	// List of websocket connections
	connections []*websocket.Conn
	// Ring buffer for log messages
	ring *ring.Ring
}

func (l *WebLogger) Init() {
	// Init writer to default error log
	l.defaultWriter = log.Writer()

	// Create empty list of websocket connections
	l.connections = make([]*websocket.Conn, 0)

	// Create ring buffer with 25 elements
	l.ring = ring.New(25)
}

// Write writes log message p to the web socket
func (l *WebLogger) Write(p []byte) (int, error) {
	// Copy to value to avoid accessing temporary variables
	l.ring.Value = make([]byte, len(p))
	copy(l.ring.Value.([]byte), p)

	// Step to next ring buffer element
	l.ring = l.ring.Next()

	// Write message to all websocket connections
	for _, c := range l.connections {
		if err := c.WriteMessage(websocket.TextMessage, p); err != nil {
			// in error case write directly to default writer
			// do not use logging.Error to avoid endless loop
			msg := fmt.Sprint("ERROR: utils: Write(): Failed to write to websocket: ", err)
			l.defaultWriter.Write([]byte(msg))
		}
	}

	// Write message to default error log
	return l.defaultWriter.Write(p)
}

// AddConnection
// * writes the contents of the ring buffer to a new web socket
// * adds websocket to the list of websockets
func (l *WebLogger) AddConnection(c *websocket.Conn) {

	// Write messages from ring buffer to new connection
	l.ring.Do(
		func(v any) {
			if v != nil {
				if p := v.([]byte); len(p) > 0 {
					if err := c.WriteMessage(websocket.TextMessage, p); err != nil {
						// in error case write directly to default writer
						// do not use logging.Error to avoid endless loop
						msg := fmt.Sprint("ERROR: utils: AddConnection(): Failed to write to new websocket: ", err)
						l.defaultWriter.Write([]byte(msg))
					}
				}
			}
		})

	// Add websocket connection to the list of websocket connections
	l.connections = append(l.connections, c)
}

// RemoveConnection removes websocket connection from the list of websocket connections
func (l *WebLogger) RemoveConnection(c *websocket.Conn) {
	l.connections = Remove(l.connections, c)
}
