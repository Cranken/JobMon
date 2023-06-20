package notify

import (
	"jobmon/config"
)

// Notifier provides functions to send notifications to administrators.
type Notifier interface {
	// Init initializes the Notifier
	Init(c config.Configuration)

	// Notify sends a notification
	Notify(subject string, message string) error
}
