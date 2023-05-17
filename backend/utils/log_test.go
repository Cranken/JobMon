package utils

import (
	"testing"

	"github.com/gorilla/websocket"
)

// func TestWebLogger_Write(t *testing.T) {
// Create a test writer for default error log
// defaultWriter := bytes.NewBuffer(nil)
// log.SetOutput(defaultWriter)

// Create a test logger
// logger := &WebLogger{}
// logger.Init()

// Create a test websocket connection
// connection := &websocket.Conn{}

// Test writing to the logger
// message := []byte("Test log message")
// _, err := logger.Write(message)
// if err != nil {
// 	t.Errorf("Unexpected error while writing to WebLogger: %v", err)
// }

// Check if the message was written to the default error log
// if !bytes.Contains(defaultWriter.Bytes(), message) {
// 	t.Errorf("WebLogger.Write did not write the message to the default error log")
// }

// Check if the message was written to the websocket connection
// if len(connection.WrittenMessages()) != 1 {
// 	t.Errorf("WebLogger.Write did not write the message to the websocket connection")
// }

// Check if an error is logged when writing to a websocket connection fails
// failingConnection := &websocket.Conn{FailNextWrite: true}
// defaultWriter.Reset()
// _, err = logger.Write(message)
// if err != nil {
// 	t.Errorf("Unexpected error while writing to WebLogger: %v", err)
// }

// Check if an error message was written to the default error log
// expectedErrorMessage := "ERROR: utils: Write(): Failed to write to websocket:"
// if !bytes.Contains(defaultWriter.Bytes(), []byte(expectedErrorMessage)) {
// 	t.Errorf("WebLogger.Write did not write the error message to the default error log")
// }
// }

func TestWebLogger_AddConnection(t *testing.T) {
	// Create a test logger
	logger := &WebLogger{}
	logger.Init()

	// Create test websocket connections
	connection1 := &websocket.Conn{}
	connection2 := &websocket.Conn{}

	// Add connections to the logger
	logger.AddConnection(connection1)
	logger.AddConnection(connection2)

	// Check if the connections were added
	if len(logger.connections) != 2 {
		t.Errorf("WebLogger.AddConnection did not add the connections")
	}

	// Check if the ring buffer messages were written to the new connection
	// if len(connection1.WrittenMessages()) != 25 {
	// 	t.Errorf("WebLogger.AddConnection did not write the ring buffer messages to the new connection")
	// }
}

func TestWebLogger_RemoveConnection(t *testing.T) {
	// Create a test logger
	logger := &WebLogger{}
	logger.Init()

	// Create test websocket connections
	connection1 := &websocket.Conn{}
	connection2 := &websocket.Conn{}

	// Add connections to the logger
	logger.AddConnection(connection1)
	logger.AddConnection(connection2)

	// Remove one connection
	logger.RemoveConnection(connection1)

	// Check if the connection was removed
	if len(logger.connections) != 1 {
		t.Errorf("WebLogger.RemoveConnection did not remove the connection")
	}
}

// func (c *websocket.Conn) WrittenMessages() [][]byte {
// 	writtenMessages := [][]byte{}
// 	for _, message := range c.WriteCalls {
// 		if len(message.Arguments) == 2 && message.Arguments[0] == websocket.TextMessage {
// 			writtenMessages = append(writtenMessages, message.Arguments[1].([]byte))
// 		}
// 	}
// 	return writtenMessages
// }
