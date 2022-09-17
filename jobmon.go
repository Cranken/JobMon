package main

import (
	"jobmon/auth"
	conf "jobmon/config"
	database "jobmon/db"
	cache "jobmon/lru_cache"
	routerImport "jobmon/router"
	jobstore "jobmon/store"
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

func main() {
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

	val, ok := os.LookupEnv("JOBMON_MIGRATE_MEMORY_TO")
	if ok && val == "psql" {
		var memStore jobstore.Store
		memStore = &jobstore.MemoryStore{}
		memStore.Init(config, &db)

		store.(*jobstore.PostgresStore).Migrate(&memStore)
	}

	registerCleanup()
	router.Init(store, &config, db, &jobCache, &authManager)
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
