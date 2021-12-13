package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"sort"
	"sync"
	"time"
)

const STOREFILE = "store.json"

type JobMetadata struct {
	Id          int
	UserId      string
	ClusterId   string
	NumNodes    int
	NodeList    string
	StartTime   int
	StopTime    int
	IsRunning   bool
	JobScript   string
	ProjectId   string
	TTL         int
	DashboardId string
}

type StopJob struct {
	StopTime int
}

type Store struct {
	Jobs       map[int]JobMetadata
	defaultTTL int
	mut        sync.Mutex
}

type JobPred func(*JobMetadata) bool

func (s *Store) Init(defTTL int) {
	data, err := os.ReadFile(STOREFILE)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("Could not read store file: %v\n Error: %v\n", STOREFILE, err)
	}
	s.mut.Lock()
	json.Unmarshal(data, s)
	if s.Jobs == nil {
		s.Jobs = make(map[int]JobMetadata)
	}
	s.defaultTTL = defTTL
	s.mut.Unlock()
	s.removeExpiredJobs()

	go s.startExpiredJobsTimer()
}

func (s *Store) Put(job JobMetadata) {
	go func() {
		if job.TTL == 0 {
			job.TTL = s.defaultTTL
		}
		s.mut.Lock()
		s.Jobs[job.Id] = job
		s.mut.Unlock()
	}()
}

func (s *Store) Get(id int) (JobMetadata, error) {
	job, pres := s.Jobs[id]
	var err error
	if !pres {
		err = fmt.Errorf("job with id: %v not found", id)
	}
	return job, err
}

func (s *Store) GetAll() []JobMetadata {
	return s.GetAllByPred(func(_ *JobMetadata) bool { return true })
}

func (s *Store) GetAllByPred(pred JobPred) []JobMetadata {
	jobs := make([]JobMetadata, 0, len(s.Jobs))
	for _, v := range s.Jobs {
		if pred(&v) {
			jobs = append(jobs, v)
		}
	}

	sort.Slice(jobs, func(i, j int) bool {
		return jobs[i].Id < jobs[j].Id
	})

	return jobs
}

func (s *Store) StopJob(id int, stopJob StopJob) JobMetadata {
	s.mut.Lock()
	job := s.Jobs[id]
	job.StopTime = stopJob.StopTime
	job.IsRunning = false
	s.Jobs[id] = job
	s.mut.Unlock()
	return s.Jobs[id]
}

func (j *JobMetadata) expired() bool {
	now := int(time.Now().Unix())
	return j.StopTime+j.TTL < now
}

func (s *Store) startExpiredJobsTimer() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C
		s.removeExpiredJobs()
	}
}

func (s *Store) removeExpiredJobs() {
	s.mut.Lock()
	for id, j := range s.Jobs {
		if !j.IsRunning && j.expired() {
			delete(s.Jobs, id)
		}
	}
	s.mut.Unlock()
}

func (s *Store) Flush() {
	data, err := json.MarshalIndent(s, "", "    ")
	if err != nil {
		log.Printf("Could not marshal store into json: %v\n", err)
	}
	os.WriteFile(STOREFILE, data, 0644)
}
