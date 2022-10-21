package utils

import (
	"jobmon/config"
	database "jobmon/db"
	"jobmon/job"
	"time"
)

type MockDB struct {
	Calls int
}

func (db *MockDB) Init(c config.Configuration) {
	db.Calls += 1
}

func (db *MockDB) Close() {
	db.Calls += 1
}

func (db *MockDB) GetJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data database.JobData, err error) {
	db.Calls += 1
	return database.JobData{Metadata: j}, nil
}

func (db *MockDB) GetJobMetadataMetrics(job *job.JobMetadata) (data []job.JobMetadataData, err error) {
	db.Calls += 1
	return data, nil
}

func (db *MockDB) RunAggregation() {
	db.Calls += 1
}

func (db *MockDB) GetDataRetentionTime() (int64, error) {
	db.Calls += 1
	return 128, nil
}

func (db *MockDB) CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []database.MetricData, chan bool) {
	monitor := make(chan []database.MetricData)
	done := make(chan bool)
	return monitor, done
}
