package persistent_store

import (
	"testing"
)

func TestGetJob(t *testing.T) {
	config := Configuration{StoreFile: "resources/store-test.json", DefaultTTL: 100}
	var db DB = &MockDB{}
	store := Store{}
	store.Init(config, &db)

	job, err := store.Get(1)
	if err != nil {
		t.Fatalf("Could not get job from store")
	}
	if job.Id != 1 {
		t.Fatalf("Got wrong job from store")
	}
}
