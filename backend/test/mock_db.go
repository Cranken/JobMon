package test

import (
	"jobmon/config"
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

func (db *MockDB) GetJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error) {
	db.Calls += 1
	return job.JobData{Metadata: j}, nil
}

func (db *MockDB) GetAggregatedJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error) {
	db.Calls += 1
	return job.JobData{Metadata: j}, nil
}

func (db *MockDB) GetJobMetadataMetrics(job *job.JobMetadata) (data []job.JobMetadataData, err error) {
	db.Calls += 1
	return data, nil
}

func (db *MockDB) GetMetricDataWithAggFn(j *job.JobMetadata, m config.MetricConfig, aggFn string, sampleInterval time.Duration) (data job.MetricData, err error) {
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

func (db *MockDB) CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []job.MetricData, chan bool) {
	monitor := make(chan []job.MetricData)
	done := make(chan bool)
	return monitor, done
}
