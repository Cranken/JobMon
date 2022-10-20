package utils

import (
	"container/ring"
	"io"
	"log"

	"github.com/gorilla/websocket"
)

type WebLogger struct {
	defaultWriter io.Writer
	connections   []*websocket.Conn
	ring          *ring.Ring
}

func (l *WebLogger) Init() {
	l.defaultWriter = log.Writer()
	l.connections = make([]*websocket.Conn, 0)
	l.ring = ring.New(25)
}

func (l *WebLogger) Write(p []byte) (n int, err error) {
	// Copy to value to avoid accessing temporary variables
	l.ring.Value = make([]byte, len(p))
	copy(l.ring.Value.([]byte), p)
	l.ring = l.ring.Next()
	for _, c := range l.connections {
		if err := c.WriteMessage(websocket.TextMessage, p); err != nil {
			l.defaultWriter.Write([]byte(err.Error()))
		}
	}
	return l.defaultWriter.Write(p)
}

func (l *WebLogger) AddConnection(c *websocket.Conn) {
	l.ring.Do(func(v any) {
		if v != nil {
			msg := v.([]byte)
			if len(msg) > 0 {
				c.WriteMessage(websocket.TextMessage, msg)
			}
		}
	})
	l.connections = append(l.connections, c)
}

func (l *WebLogger) RemoveConnection(c *websocket.Conn) {
	l.connections = Remove(l.connections, c)
}
