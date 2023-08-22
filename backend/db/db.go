package db

import (
	conf "jobmon/config"
	"jobmon/job"
	"time"
)

// DB is the interface that wraps a list of methods used for setting up, closing and
// working with an InfluxDB.
type DB interface {

	// Init initializes a InfluxDB connection based on the configuration c.
	Init(c conf.Configuration)

	// Close shuts down the connection to the InfluxDB.
	Close()

	// GetJobData returns data for job executed on nodes for sampleInterval, if raw is true then
	// result data contains the raw metric data.
	GetJobData(job *job.JobMetadata, nodes []*job.Node, sampleInterval time.Duration, raw bool) (data job.JobData, err error)

	// GetJobMetadataMetrics returns the metadata metrics data for job j.
	GetJobMetadataMetrics(job *job.JobMetadata) (data []job.JobMetadataData, err error)

	// GetAggregatedJobData similar to GetJobData except that it returns the data for single node jobs.
	// Single node jobs also return aggregated data for metrics with metric granularity finer than per node.
	GetAggregatedJobData(job *job.JobMetadata, nodes []*job.Node, sampleInterval time.Duration, raw bool) (data job.JobData, err error)

	// GetMetricDataWithAggFn returns the the metric-data data for job j based on the configuration m
	// and aggregated by function aggFn.
	GetMetricDataWithAggFn(j *job.JobMetadata, m conf.MetricConfig, aggFn string, sampleInterval time.Duration) (data job.MetricData, err error)

	// RunAggregation runs the aggregation for node data in the db.
	RunAggregation()

	// CreateLiveMonitoringChannel creates a channel which periodically returns
	// the latest metric data for the given job. Also it returns a channel
	// which can be used to send a close signal.
	CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []job.MetricData, chan bool)
}
