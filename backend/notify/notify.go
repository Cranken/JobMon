package notify

import (
	"jobmon/config"
	"jobmon/logging"
)

type EmailNotifier struct {
	SenderAddress   string
	SenderPassword  string
	ReceiverAddress string
}

func (em *EmailNotifier) Init(c config.Configuration) {
	em.SenderAddress = c.Email.SenderAddress
	em.SenderPassword = c.Email.SenderPassword
	em.ReceiverAddress = c.Email.ReceiverAddress
	logging.Info("EmailNotifier: Init(): Initialized email-notifier")
}

func (em *EmailNotifier) Notify(message string) {
	logging.Info("EmailNotifier: Notify(): Sending message \"", message, "\" via email")
}
