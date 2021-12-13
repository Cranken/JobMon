package main

import (
	"container/list"
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
	data []MetricData
}

func (c *LRUCache) Init(size int, db *DB) {
	c.mut.Lock()
	defer c.mut.Unlock()
	c.size = size
	c.list = new(list.List)
	c.db = db
}

func (c *LRUCache) Get(job JobMetadata) []MetricData {
	c.mut.Lock()
	defer c.mut.Unlock()

	data := c.find(job.Id)
	if data != nil {
		return data
	}
	data = c.db.GetJobData(job)
	c.put(Item{id: job.Id, data: data})
	return data
}

func (c *LRUCache) put(data Item) {
	if c.list.Len() >= c.size {
		c.list.Remove(c.list.Back())
	}
	c.list.PushFront(data)
}

func (c *LRUCache) find(id int) []MetricData {
	for el := c.list.Front(); el != nil; el = el.Next() {
		if el.Value.(Item).id == id {
			c.list.MoveToFront(el)
			return el.Value.(Item).data
		}
	}
	return nil
}
