package main

import (
	"jobmon/auth"
	conf "jobmon/config"
	database "jobmon/db"
	"jobmon/logging"
	cache "jobmon/lru_cache"
	"jobmon/notify"
	routerImport "jobmon/router"
	jobstore "jobmon/store"
	"jobmon/utils"
	"os"
	"os/signal"
	"syscall"
)

var (
	store       jobstore.Store
	config      = conf.Configuration{}
	db          database.DB
	jobCache    = cache.LRUCache{}
	authManager = auth.AuthManager{}
	router      = routerImport.Router{}
	webLogger   = utils.WebLogger{}
	notifier    notify.Notifier
)

func main() {
	webLogger.Init()
	logging.SetOutput(&webLogger)

	// parse the json configuration file and map the data to config.
	config.Init()

	// create and initialize the InfluxDB
	db = &database.InfluxDB{}
	db.Init(config)

	// create and initialize a PostgresStore
	store = &jobstore.PostgresStore{}
	store.Init(config, &db)

	// setup lru cache for storing job data
	jobCache.Init(config, &db, &store)

	// setup email notifier
	notifier = &notify.EmailNotifier{}
	notifier.Init(config)

	// setup the authentication manager
	authManager.Init(config, &store, &notifier)

	// cleanup everything
	registerCleanup()

	// start the server
	router.Init(store, &config, &db, &jobCache, &authManager, &webLogger, &notifier)
}

// registerCleanup performs all the necessary cleanups before starting a fresh
// instance of the server.
func registerCleanup() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-sigChan
		store.Flush()
		db.Close()
		config.Flush()
		os.Exit(0)
	}()
}
