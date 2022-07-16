package db

import (
	conf "jobmon/config"
	"jobmon/job"
	"time"
)

type DB interface {
	Init(c conf.Configuration)
	Close()
	// Get job data of the given job and sample interval
	GetJobData(job *job.JobMetadata, sampleInterval time.Duration, raw bool) (data JobData, err error)
	// Get job data for a specific node specified by node parameter in the given job and sample interval
	GetNodeJobData(job *job.JobMetadata, node string, sampleInterval time.Duration, raw bool) (data JobData, err error)
	// Get job metadata metrics for the given job
	GetJobMetadataMetrics(job *job.JobMetadata) (data []job.JobMetadataData, err error)
	// Run aggregation tasks in the Influxdb
	RunAggregation()
	// Get job data retention time
	GetDataRetentionTime() (int64, error)
	// Creates a channel which periodically returns the latest metric data for the given job.
	// Also returns a channel which can be used to send an close signal
	CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []MetricData, chan bool)
}
