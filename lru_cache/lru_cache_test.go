package lru_cache

import (
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
	"jobmon/utils"
	"testing"
	"time"
)

func TestPutCleanup(t *testing.T) {
	cache := LRUCache{}
	config := config.Configuration{CacheSize: 3}
	var db db.DB = &utils.MockDB{}
	cache.Init(config, &db)

	if cache.list.Len() != 0 {
		t.Fatalf("List length is not 0")
	}
	cache.put(Item{id: 1})
	cache.put(Item{id: 2})
	cache.put(Item{id: 3})
	cache.put(Item{id: 4})
	if cache.list.Len() != 3 {
		t.Fatalf("List length is not 3")
	}
	_, err := cache.find(1)
	if err == nil {
		t.Fatalf("Did not clean up least recently used item")
	}
}

func TestPutCleanupAfterAccess(t *testing.T) {
	cache := LRUCache{}
	config := config.Configuration{CacheSize: 3}
	var db db.DB = &utils.MockDB{}
	cache.Init(config, &db)

	cache.put(Item{id: 1})
	cache.put(Item{id: 2})
	cache.put(Item{id: 3})
	_, err := cache.find(1)
	if err != nil {
		t.Fatalf("Error while finding item")
	}
	cache.put(Item{id: 4})
	_, err = cache.find(2)
	if err == nil {
		t.Fatalf("Did not clean up least recently used item")
	}
}

func TestGet(t *testing.T) {
	cache := LRUCache{}
	config := config.Configuration{CacheSize: 3}
	var db db.DB = &utils.MockDB{}
	cache.Init(config, &db)

	job := job.JobMetadata{Id: 1}
	cache.Get(&job, 30*time.Second)
	if db.(*utils.MockDB).Calls != 1 {
		t.Fatalf("Did not retrieve job data from db")
	}

	dat, _ := cache.Get(&job, 30*time.Second)
	if dat.Metadata.Id != 1 {
		t.Fatalf("Retrieved wrong item from cache")
	}
	if db.(*utils.MockDB).Calls != 1 {
		t.Fatalf("Called db on cached item")
	}
}
