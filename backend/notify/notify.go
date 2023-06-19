package notify

import (
	"jobmon/config"
)

// EmailNotifier provides functions to send notifications as emails to notify administrators.
type Notifier interface {
	// Init initializes the Notifier
	Init(c config.Configuration)

	// Notify sends a notification
	Notify(subject string, message string) error
}
