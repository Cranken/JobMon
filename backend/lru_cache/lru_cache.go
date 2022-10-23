package lru_cache

import (
	"container/list"
	"fmt"
	conf "jobmon/config"
	"jobmon/db"
	"jobmon/job"
	"jobmon/store"
	"sync"
	"time"
)

type LRUCache struct {
	size  int
	list  *list.List
	mut   sync.Mutex
	db    *db.DB
	store *store.Store
}

type Item struct {
	id   int
	data job.JobData
}

func (c *LRUCache) Init(config conf.Configuration, db *db.DB, store *store.Store) {
	c.size = config.CacheSize
	c.list = new(list.List)
	c.db = db
	c.store = store
}

// Get job data for the given sample interval from cache by job metadata
func (c *LRUCache) Get(j *job.JobMetadata, sampleInterval time.Duration) (data job.JobData, err error) {
	c.mut.Lock()
	defer c.mut.Unlock()

	data, err = c.find(j.Id)
	if err == nil {
		return data, err
	}
	if j.NumNodes == 1 {
		data, err = (*c.db).GetJobData(j, j.NodeList, sampleInterval, false)
	} else {
		data, err = (*c.db).GetJobData(j, "", sampleInterval, false)
	}
	if err == nil {
		c.put(Item{id: j.Id, data: data})
	}
	return data, err
}

func (c *LRUCache) UpdateJob(id int) {
	c.mut.Lock()
	defer c.mut.Unlock()

	data, err := c.find(id)
	if err != nil {
		return
	}
	job, err := (*c.store).GetJob(id)
	if err != nil {
		return
	}
	// Job is at front after retrieving it so it is fine to remove front
	c.list.Remove(c.list.Front())
	data.Metadata = &job
	c.put(Item{id: job.Id, data: data})
}

func (c *LRUCache) put(data Item) {
	if c.list.Len() >= c.size {
		c.list.Remove(c.list.Back())
	}
	c.list.PushFront(data)
}

func (c *LRUCache) find(id int) (data job.JobData, err error) {
	for el := c.list.Front(); el != nil; el = el.Next() {
		if el.Value.(Item).id == id {
			c.list.MoveToFront(el)
			return el.Value.(Item).data, nil
		}
	}
	return data, fmt.Errorf("key %v not found in cache", id)
}
