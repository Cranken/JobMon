package notify

import (
	"jobmon/config"
	"jobmon/logging"
)

// EmailNotifier provides functions to send notifications as emails to notify administrators.
type EmailNotifier struct {
	SenderAddress   string
	SenderPassword  string
	ReceiverAddress string
}

// Init reads email-addresses and passwords from the configuration
func (em *EmailNotifier) Init(c config.Configuration) {
	em.SenderAddress = c.Email.SenderAddress
	em.SenderPassword = c.Email.SenderPassword
	em.ReceiverAddress = c.Email.ReceiverAddress
	logging.Info("EmailNotifier: Init(): Initialized email-notifier")
}

// Sends a notification with the given message
func (em *EmailNotifier) Notify(message string) {
	logging.Info("EmailNotifier: Notify(): Sending message \"", message, "\" via email")
}
