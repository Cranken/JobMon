package test

import (
	"jobmon/config"
)

type Message struct {
	Subject string
	Message string
}

// EmailNotifier provides functions to send notifications as emails to notify administrators.
type MockEmailNotifier struct {
	Input []Message
}

func (em *MockEmailNotifier) Init(c config.Configuration) {
}

// Sends a notification with the given message
func (em *MockEmailNotifier) Notify(subject string, message string) error {
	var m Message = Message{Subject: subject, Message: message}
	em.Input = append(em.Input, m)
	return nil
}
