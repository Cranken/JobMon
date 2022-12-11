package test

import (
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
)

type MockStore struct {
	Calls int
}

func (s *MockStore) Init(c config.Configuration, database *db.DB) {
	s.Calls += 1
}

func (s *MockStore) Flush() {
	s.Calls += 1
}

func (s *MockStore) PutJob(job job.JobMetadata) error {
	s.Calls += 1
	return nil
}

func (s *MockStore) GetJob(id int) (job.JobMetadata, error) {
	s.Calls += 1
	return job.JobMetadata{}, nil
}

func (s *MockStore) GetAllJobs() ([]job.JobMetadata, error) {
	s.Calls += 1
	return make([]job.JobMetadata, 0), nil
}

func (s *MockStore) GetFilteredJobs(filter job.JobFilter) ([]job.JobMetadata, error) {
	s.Calls += 1
	return make([]job.JobMetadata, 0), nil
}

func (s *MockStore) StopJob(id int, stopJob job.StopJob) error {
	s.Calls += 1
	return nil
}

func (s *MockStore) UpdateJob(job job.JobMetadata) error {
	s.Calls += 1
	return nil
}

func (s *MockStore) GetJobTags(username string) ([]job.JobTag, error) {
	s.Calls += 1
	return make([]job.JobTag, 0), nil
}

func (s *MockStore) AddTag(id int, tag *job.JobTag) error {
	s.Calls += 1
	return nil
}

func (s *MockStore) RemoveTag(id int, tag *job.JobTag) error {
	s.Calls += 1
	return nil
}

func (s *MockStore) GetUserSessionToken(username string) (string, bool) {
	s.Calls += 1
	return "", true
}

func (s *MockStore) SetUserSessionToken(username string, token string) {
	s.Calls += 1
}

func (s *MockStore) RemoveUserSessionToken(username string) {
	s.Calls += 1
}

func (s *MockStore) GetUserRoles(username string) ([]string, bool) {
	s.Calls += 1
	return make([]string, 0), true
}

func (s *MockStore) SetUserRoles(username string, roles []string) {
	s.Calls += 1
}
