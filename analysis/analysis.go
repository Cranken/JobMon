package analysis

import (
	"jobmon/config"
	"jobmon/job"
)

type Analysis interface {
	Init(c config.Configuration)
	// Calculates the footprint statistics for the given job
	CalcFootprint(job *job.JobMetadata) error

	CalcPerNodeStatistics(job *job.JobMetadata) map[string]NodeStatistics
}

type NodeStatistics struct {
	Metrics map[string]MetricStatistic
}

type MetricStatistic struct {
	Mean     float32
	Median   float32
	Variance float32
}
