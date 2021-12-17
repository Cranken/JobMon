package main

import (
	"container/list"
	"fmt"
	"sync"
)

type LRUCache struct {
	size int
	list *list.List
	mut  sync.Mutex
	db   *DB
}

type Item struct {
	id   int
	data JobData
}

func (c *LRUCache) Init(size int, db *DB) {
	c.mut.Lock()
	defer c.mut.Unlock()
	c.size = size
	c.list = new(list.List)
	c.db = db
}

func (c *LRUCache) Get(job JobMetadata) (data JobData, err error) {
	c.mut.Lock()
	defer c.mut.Unlock()

	data, err = c.find(job.Id)
	if err == nil {
		return data, err
	}
	data, err = c.db.GetJobData(job)
	if err == nil {
		c.put(Item{id: job.Id, data: data})
	}
	return data, err
}

func (c *LRUCache) put(data Item) {
	if c.list.Len() >= c.size {
		c.list.Remove(c.list.Back())
	}
	c.list.PushFront(data)
}

func (c *LRUCache) find(id int) (data JobData, err error) {
	for el := c.list.Front(); el != nil; el = el.Next() {
		if el.Value.(Item).id == id {
			c.list.MoveToFront(el)
			return el.Value.(Item).data, nil
		}
	}
	return data, fmt.Errorf("key %v not found in cache", id)
}
