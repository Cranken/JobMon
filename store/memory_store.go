package store

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

type MemoryStore struct {
	Jobs           map[int]*job.JobMetadata
	SessionStorage map[string]string
	mut            sync.Mutex
	database       *db.DB
	config         config.Configuration
}

type JobPred func(*job.JobMetadata) bool

func (s *MemoryStore) Init(c config.Configuration, database *db.DB) {
	s.config = c
	s.database = database
	data, err := os.ReadFile(s.config.StoreFile)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("Could not read store file: %v\n Error: %v\n", s.config.StoreFile, err)
	}
	json.Unmarshal(data, s)
	if s.Jobs == nil {
		s.Jobs = make(map[int]*job.JobMetadata)
	}
	if s.SessionStorage == nil {
		s.SessionStorage = make(map[string]string)
	}
	s.removeExpiredJobs()
	s.finishOvertimeJobs()
	s.addDataToIncompleteJobs()

	go s.startCleanJobsTimer()
}

func (s *MemoryStore) PutJob(job job.JobMetadata) {
	go func() {
		if job.TTL == 0 {
			job.TTL = s.config.DefaultTTL
		}
		s.mut.Lock()
		s.Jobs[job.Id] = &job
		s.mut.Unlock()
	}()
}

func (s *MemoryStore) GetJob(id int) (*job.JobMetadata, error) {
	job, pres := s.Jobs[id]
	var err error
	if !pres {
		err = fmt.Errorf("job with id: %v not found", id)
	}
	return job, err
}

func (s *MemoryStore) GetAllJobs() []*job.JobMetadata {
	return s.GetJobsByPred(func(_ *job.JobMetadata) bool { return true })
}

func (s *MemoryStore) GetJobsByPred(pred JobPred) []*job.JobMetadata {
	jobs := make([]*job.JobMetadata, 0, len(s.Jobs))
	for _, v := range s.Jobs {
		if pred(v) {
			jobs = append(jobs, v)
		}
	}

	sort.Slice(jobs, func(i, j int) bool {
		return jobs[i].Id < jobs[j].Id
	})

	return jobs
}

func (s *MemoryStore) StopJob(id int, stopJob job.StopJob) (job *job.JobMetadata, err error) {
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
	s.addMetadataToJob(job)
	return s.Jobs[id], nil
}

func (s *MemoryStore) startCleanJobsTimer() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C
		s.removeExpiredJobs()
		s.finishOvertimeJobs()
	}
}

func (s *MemoryStore) removeExpiredJobs() {
	s.mut.Lock()
	for id, j := range s.Jobs {
		if !j.IsRunning && j.Expired() {
			delete(s.Jobs, id)
		}
	}
	s.mut.Unlock()
}

// Mark jobs as stopped if they exceed their maximum allowed wall clock time
func (s *MemoryStore) finishOvertimeJobs() {
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

func (s *MemoryStore) addMetadataToJob(job *job.JobMetadata) error {
	data, err := (*s.database).GetJobMetadataMetrics(job)
	if err == nil {
		job.Data = data
		s.Jobs[job.Id] = job
	}
	return err
}

func (s *MemoryStore) addDataToIncompleteJobs() {
	s.mut.Lock()
	defer s.mut.Unlock()
	for i, j := range s.Jobs {
		if j.Data == nil && !j.IsRunning {
			data, err := (*s.database).GetJobMetadataMetrics(j)
			if err == nil {
				j.Data = data
				s.Jobs[i] = j
			}
		}
	}
}

func (s *MemoryStore) GetUserSessionToken(username string) (string, bool) {
	token, ok := s.SessionStorage[username]
	return token, ok
}

func (s *MemoryStore) SetUserSessionToken(username string, token string) {
	s.SessionStorage[username] = token
}

func (s *MemoryStore) RemoveUserSessionToken(username string) {
	delete(s.SessionStorage, username)
}

func (s *MemoryStore) Flush() {
	data, err := json.MarshalIndent(s, "", "    ")
	if err != nil {
		log.Printf("Could not marshal store into json: %v\n", err)
	}
	os.WriteFile(s.config.StoreFile, data, 0644)
}
