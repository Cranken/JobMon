package utils

import (
	"io"
	"log"

	"github.com/gorilla/websocket"
)

type WebLogger struct {
	defaultWriter io.Writer
	connections []*websocket.Conn
}

func (l *WebLogger) Init() {
	l.defaultWriter = log.Writer()
	l.connections = make([]*websocket.Conn, 0)
}

func (l *WebLogger) Write(p []byte) (n int, err error) {
	for _, c := range l.connections {
		if err := c.WriteMessage(websocket.TextMessage, p); err != nil {
			l.defaultWriter.Write([]byte(err.Error()))
		}
	}
	return l.defaultWriter.Write(p)
}

func (l *WebLogger) AddConnection(c *websocket.Conn) {
	l.connections = append(l.connections, c)
}

func (l *WebLogger) RemoveConnection(c *websocket.Conn) {
	l.connections = Remove(l.connections, c)
}