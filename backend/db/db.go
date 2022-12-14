package db

import (
	conf "jobmon/config"
	"jobmon/job"
	"time"
)

type DB interface {
	Init(c conf.Configuration)
	Close()
	// Get job data of the given job for the specified nodes and sample interval.
	// If raw is true then the MetricData contained in the result data contains the raw metric data.
	// Nodes should be specified as a list of nodes separated by a '|' character.
	// If no nodes are specified, data for all nodes are queried.
	GetJobData(job *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error)
	// Get job metadata metrics for the given job
	GetJobMetadataMetrics(job *job.JobMetadata) (data []job.JobMetadataData, err error)
	// Behaves like GetJobData except for single node jobs.
	// Single node jobs also return aggregated data for metrics with metric granularity finer than per node.
	GetAggregatedJobData(job *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error)
	// Get the data for a metric with the given aggFn
	GetMetricDataWithAggFn(j *job.JobMetadata, m conf.MetricConfig, aggFn string, sampleInterval time.Duration) (data job.MetricData, err error)
	// Run the aggregation for node data in the db
	RunAggregation()
	// Creates a channel which periodically returns the latest metric data for the given job.
	// Also returns a channel which can be used to send an close signal
	CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []job.MetricData, chan bool)
}
