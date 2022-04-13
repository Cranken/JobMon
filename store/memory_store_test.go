package store

import (
	"jobmon/config"
	database "jobmon/db"
	"jobmon/utils"
	"testing"
)

func TestGetJob(t *testing.T) {
	config := config.Configuration{JobStore: config.JobStoreConfig{MemFilePath: "../resources/store-test.json"}, DefaultTTL: 100}
	var db database.DB = &utils.MockDB{}
	store := MemoryStore{}
	store.Init(config, &db)

	job, err := store.GetJob(1)
	if err != nil {
		t.Fatalf("Could not get job from store")
	}
	if job.Id != 1 {
		t.Fatalf("Got wrong job from store")
	}
}
