package main

import (
	"jobmon/auth"
	conf "jobmon/config"
	database "jobmon/db"
	cache "jobmon/lru_cache"
	routerImport "jobmon/router"
	jobstore "jobmon/store"
	"jobmon/utils"
	"log"
	"os"
	"os/signal"
	"syscall"
)

var store jobstore.Store
var config = conf.Configuration{}
var db database.DB
var jobCache = cache.LRUCache{}
var authManager = auth.AuthManager{}
var router = routerImport.Router{}
var webLogger = utils.WebLogger{}

func main() {
	webLogger.Init()
	log.SetOutput(&webLogger)

	config.Init()
	db = &database.InfluxDB{}
	db.Init(config)

	switch config.JobStore.Type {
	case "memory":
		store = &jobstore.MemoryStore{}
	default:
		store = &jobstore.PostgresStore{}
	}

	store.Init(config, &db)
	jobCache.Init(config, &db, &store)
	authManager.Init(config, &store)

	registerCleanup()
	router.Init(store, &config, &db, &jobCache, &authManager, &webLogger)
}

func registerCleanup() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-sigChan
		store.Flush()
		db.Close()
		os.Exit(0)
	}()
}
