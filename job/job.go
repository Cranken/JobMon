package job

import (
	"jobmon/config"
	"math"
	"time"
)

const DEFAULT_MAX_POINTS_PER_JOB = 200
const DEFAULT_MIN_POINTS_PER_JOB = 50

type JobMetadata struct {
	Id           int
	UserId       int
	UserName     string
	GroupId      int
	GroupName    string
	ClusterId    string
	NumNodes     int
	NumTasks     int
	TasksPerNode int
	GPUsPerNode  int
	NodeList     string
	StartTime    int
	StopTime     int
	IsRunning    bool
	JobName      string
	Account      string
	TTL          int
	Partition    string
	JobScript    string
	ExitCode     int
	Data         []JobMetadataData
}

type JobMetadataData struct {
	Config config.MetricConfig
	Data   map[string]float64
}

type StopJob struct {
	ExitCode int
	StopTime int
}

type JobListData struct {
	Jobs   []JobMetadata
	Config JobListConfig
}

type JobListConfig struct {
	Metrics           []string
	RadarChartMetrics []string
}

func (j *JobMetadata) Expired() bool {
	now := int(time.Now().Unix())
	if j.TTL == 0 {
		return false
	}
	return j.StopTime+j.TTL < now
}

func (j *JobMetadata) Overtime(maxTime int) bool {
	now := int(time.Now().Unix())
	return j.StartTime+maxTime < now
}

func (j *JobMetadata) CalculateSampleIntervals(metricSampleInterval time.Duration) (intervals []float64, bestAvailableInterval float64) {
	defaultIntervals := []float64{30, 60, 120, 300, 600, 1800}
	duration := float64(j.StopTime - j.StartTime)
	datapoints := duration / metricSampleInterval.Seconds()
	factor := math.Ceil(datapoints / DEFAULT_MAX_POINTS_PER_JOB)
	bestInterval := factor * metricSampleInterval.Seconds()
	bestAvailableInterval = metricSampleInterval.Seconds()
	for _, v := range defaultIntervals {
		if math.Abs(v-bestInterval) < math.Abs(bestAvailableInterval-bestInterval) {
			bestAvailableInterval = v
		}
	}
	for _, v := range defaultIntervals {
		if metricSampleInterval.Seconds() <= v && v <= bestAvailableInterval {
			intervals = append(intervals, v)
		}
	}
	return
}
