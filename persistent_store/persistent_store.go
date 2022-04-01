package persistent_store

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
	"log"
	"os"
	"sort"
	"sync"
	"time"
)

type Store struct {
	Jobs           map[int]job.JobMetadata
	SessionStorage map[string]string
	mut            sync.Mutex
	database       *db.DB
	config         config.Configuration
}

type JobPred func(*job.JobMetadata) bool

func (s *Store) Init(c config.Configuration, database *db.DB) {
	s.config = c
	s.database = database
	data, err := os.ReadFile(s.config.StoreFile)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("Could not read store file: %v\n Error: %v\n", s.config.StoreFile, err)
	}
	json.Unmarshal(data, s)
	if s.Jobs == nil {
		s.Jobs = make(map[int]job.JobMetadata)
	}
	if s.SessionStorage == nil {
		s.SessionStorage = make(map[string]string)
	}
	s.removeExpiredJobs()
	s.finishOvertimeJobs()
	s.addDataToIncompleteJobs()

	go s.startCleanJobsTimer()
}

// Add job metadata to store
func (s *Store) Put(job job.JobMetadata) {
	go func() {
		if job.TTL == 0 {
			job.TTL = s.config.DefaultTTL
		}
		s.mut.Lock()
		s.Jobs[job.Id] = job
		s.mut.Unlock()
	}()
}

// Get job metadata by job id
func (s *Store) Get(id int) (job.JobMetadata, error) {
	job, pres := s.Jobs[id]
	var err error
	if !pres {
		err = fmt.Errorf("job with id: %v not found", id)
	}
	return job, err
}

// Get metadata of all jobs
func (s *Store) GetAll() []job.JobMetadata {
	return s.GetAllByPred(func(_ *job.JobMetadata) bool { return true })
}

// Get metadata of all jobs that fulfill the given predicate
func (s *Store) GetAllByPred(pred JobPred) []job.JobMetadata {
	jobs := make([]job.JobMetadata, 0, len(s.Jobs))
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

// Mark the given job as stopped
func (s *Store) StopJob(id int, stopJob job.StopJob) (job job.JobMetadata, err error) {
	s.mut.Lock()
	defer s.mut.Unlock()
	job, ok := s.Jobs[id]
	if !ok {
		return job, fmt.Errorf("can't stop job: %v, not found", id)
	}
	job.StopTime = stopJob.StopTime
	job.ExitCode = stopJob.ExitCode
	job.IsRunning = false
	s.Jobs[id] = job
	s.addMetadataToJob(&job)
	return s.Jobs[id], nil
}

func (s *Store) startCleanJobsTimer() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C
		s.removeExpiredJobs()
		s.finishOvertimeJobs()
	}
}

func (s *Store) removeExpiredJobs() {
	s.mut.Lock()
	for id, j := range s.Jobs {
		if !j.IsRunning && j.Expired() {
			delete(s.Jobs, id)
		}
	}
	s.mut.Unlock()
}

// Mark jobs as stopped if they exceed their maximum allowed wall clock time
func (s *Store) finishOvertimeJobs() {
	for _, j := range s.Jobs {
		if j.IsRunning {
			partition, ok := s.config.Partitions[j.Partition]
			maxTime := 86400
			if ok {
				maxTime = partition.MaxTime
			}
			if j.Overtime(maxTime) {
				s.StopJob(j.Id, job.StopJob{StopTime: j.StartTime + maxTime, ExitCode: 1})
			}
		}
	}
}

func (s *Store) addMetadataToJob(job *job.JobMetadata) error {
	data, err := (*s.database).GetJobMetadataMetrics(job)
	if err == nil {
		job.Data = data
		s.Jobs[job.Id] = *job
	}
	return err
}

func (s *Store) addDataToIncompleteJobs() {
	s.mut.Lock()
	defer s.mut.Unlock()
	for i, j := range s.Jobs {
		if j.Data == nil && !j.IsRunning {
			data, err := (*s.database).GetJobMetadataMetrics(&j)
			if err == nil {
				j.Data = data
				s.Jobs[i] = j
			}
		}
	}
}

func (s *Store) Flush() {
	data, err := json.MarshalIndent(s, "", "    ")
	if err != nil {
		log.Printf("Could not marshal store into json: %v\n", err)
	}
	os.WriteFile(s.config.StoreFile, data, 0644)
}
