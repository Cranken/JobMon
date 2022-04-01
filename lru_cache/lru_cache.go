package lru_cache

import (
	"container/list"
	"fmt"
	conf "jobmon/config"
	"jobmon/db"
	"jobmon/job"
	"sync"
	"time"
)

type LRUCache struct {
	size int
	list *list.List
	mut  sync.Mutex
	db   *db.DB
}

type Item struct {
	id   int
	data db.JobData
}

func (c *LRUCache) Init(config conf.Configuration, db *db.DB) {
	c.size = config.CacheSize
	c.list = new(list.List)
	c.db = db
}

// Get job data for the given sample interval from cache by job metadata
func (c *LRUCache) Get(j *job.JobMetadata, sampleInterval time.Duration) (data db.JobData, err error) {
	c.mut.Lock()
	defer c.mut.Unlock()

	data, err = c.find(j.Id)
	if err == nil {
		return data, err
	}
	data, err = (*c.db).GetJobData(j, sampleInterval)
	if err == nil {
		c.put(Item{id: j.Id, data: data})
	}
	return data, err
}

func (c *LRUCache) put(data Item) {
	if c.list.Len() >= c.size {
		c.list.Remove(c.list.Back())
	}
	c.list.PushFront(data)
}

func (c *LRUCache) find(id int) (data db.JobData, err error) {
	for el := c.list.Front(); el != nil; el = el.Next() {
		if el.Value.(Item).id == id {
			c.list.MoveToFront(el)
			return el.Value.(Item).data, nil
		}
	}
	return data, fmt.Errorf("key %v not found in cache", id)
}
