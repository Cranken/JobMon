package notify

import (
	"jobmon/config"
	"jobmon/logging"

	"crypto/tls"

	gomail "gopkg.in/mail.v2"
)

// EmailNotifier provides functions to send notifications as emails to notify administrators.
type EmailNotifier struct {
	SenderAddress   string
	SenderPassword  string
	ReceiverAddress string
	SmtpHost        string
	SmtpPort        int
}

// Init reads email-addresses and passwords from the configuration
func (em *EmailNotifier) Init(c config.Configuration) {
	em.SenderAddress = c.Email.SenderAddress
	em.SenderPassword = c.Email.SenderPassword
	em.ReceiverAddress = c.Email.ReceiverAddress
	em.SmtpHost = c.Email.SmtpHost
	em.SmtpPort = c.Email.SmtpPort
	logging.Info("EmailNotifier: Init(): Initialized email-notifier")
}

// Sends a notification with the given message
func (em *EmailNotifier) Notify(subject string, message string) error {
	logging.Info("EmailNotifier: Notify(): Sending message \"", subject, "\" \"", message, "\" via email")

	m := gomail.NewMessage()
	m.SetHeader("From", em.SenderAddress)
	m.SetHeader("To", em.ReceiverAddress)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", message)

	// Settings for SMTP server
	d := gomail.NewDialer(em.SmtpHost, em.SmtpPort, em.SenderAddress, em.SenderPassword)
	d.TLSConfig = &tls.Config{ServerName: em.SmtpHost}

	// Send E-Mail
	err := d.DialAndSend(m)
	if err != nil {
		logging.Error("EmailNotifier: Notify(): Failed to send Email")
		return err
	}

	return nil
}
