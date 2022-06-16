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
	GetJobData(job *job.JobMetadata, sampleInterval time.Duration) (data JobData, err error)
	// Get job data for a specific node specified by node parameter in the given job and sample interval
	GetNodeJobData(job *job.JobMetadata, node string, sampleInterval time.Duration) (data JobData, err error)
	// Get job metadata metrics for the given job
	GetJobMetadataMetrics(job *job.JobMetadata) (data []job.JobMetadataData, err error)
	// Run aggregation tasks in the Influxdb
	RunAggregation()
	// Get job data retention time
	GetDataRetentionTime() (int64, error)
	// Live Monitoring Channel
	CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []MetricData, chan bool)
}
