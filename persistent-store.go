package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"os/signal"
	"sort"
	"sync"
	"syscall"
	"time"
)

const STOREFILE = "store.json"

type Job struct {
	Id        int
	UserId    string
	ClusterId string
	StartTime int
	StopTime  int
	IsRunning bool
	JobScript string
	ProjectId string
	TTL       int
}

type StopJob struct {
	StopTime int
}

type Store struct {
	Jobs       map[int]Job
	defaultTTL int
	mut        sync.Mutex
}

func (s *Store) Init(defTTL int) {
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
		s.Jobs[job.Id] = job
		s.mut.Unlock()
	}()
}

func (s *Store) Get(id int) (Job, error) {
	for _, job := range s.Jobs {
		if job.Id == id {
			return job, nil
		}
	}
	return Job{}, fmt.Errorf("Job with id: %v not found", id)
}

func (s *Store) GetAll() []Job {
	jobs := make([]Job, 0, len(s.Jobs))
	for _, v := range s.Jobs {
		jobs = append(jobs, v)
	}

	sort.Slice(jobs, func(i, j int) bool {
		return jobs[i].Id < jobs[j].Id
	})

	return jobs
}

func (s *Store) StopJob(id int, stopJob StopJob) {
	s.mut.Lock()
	job := s.Jobs[id]
	job.StopTime = stopJob.StopTime
	job.IsRunning = false
	s.Jobs[id] = job
	s.mut.Unlock()
}

func (j *Job) expired() bool {
	now := int(time.Now().Unix())
	return j.StopTime+j.TTL < now
}

func (s *Store) removeExpiredJobs() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C

		s.mut.Lock()
		for id, j := range s.Jobs {
			if !j.IsRunning && j.expired() {
				delete(s.Jobs, id)
			}
		}

		s.mut.Unlock()
	}
}

func (s *Store) Flush() {
	data, err := json.MarshalIndent(s, "", "    ")
	if err != nil {
		log.Printf("Could not marshal store into json: %v\n", err)
	}
	os.WriteFile(STOREFILE, data, 0644)
}
