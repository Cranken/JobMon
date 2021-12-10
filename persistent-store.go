package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

const STOREFILE = "store.json"

type Job struct {
	Id        int
	UserId    string
	ClusterId string
	StartTime time.Time
	StopTime  time.Time
	IsRunning bool
	JobScript string
	ProjectId string
	TTL       time.Duration
}

type Store struct {
	Jobs       []Job
	defaultTTL time.Duration
	mut        sync.Mutex
}

func (s *Store) Init(defTTL time.Duration) {
	data, err := os.ReadFile(STOREFILE)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("Could not read store file: %v\n Error: %v\n", STOREFILE, err)
	}
	s.mut.Lock()
	json.Unmarshal(data, s)
	s.defaultTTL = defTTL
	s.mut.Unlock()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-sigChan
		s.Flush()
		os.Exit(0)
	}()

	go s.removeExpiredJobs()
}

func (s *Store) Put(job Job) {
	go func() {
		if job.TTL == 0 {
			job.TTL = s.defaultTTL
		}
		s.mut.Lock()
		s.Jobs = append(s.Jobs, job)
		s.mut.Unlock()
	}()
}

func (s *Store) Get(id int) (Job, error) {
	s.mut.Lock()
	defer s.mut.Unlock()
	for _, job := range s.Jobs {
		if job.Id == id {
			return job, nil
		}
	}
	return Job{}, fmt.Errorf("Job with id: %v not found", id)
}

func (s *Store) GetAll() []Job {
	s.mut.Lock()
	defer s.mut.Unlock()
	return s.Jobs
}

func (s *Store) removeExpiredJobs() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C

		var jobs []Job
		for _, j := range s.Jobs {
			if !j.IsRunning && j.StopTime.Add(j.TTL).Before(time.Now()) {
				continue
			}
			jobs = append(jobs, j)
		}
		s.mut.Lock()
		s.Jobs = jobs
		s.mut.Unlock()

	}
}

func (s *Store) Flush() {
	data, err := json.Marshal(s)
	if err != nil {
		log.Printf("Could not marshal store into json: %v\n", err)
	}
	os.WriteFile(STOREFILE, data, 0644)
}
