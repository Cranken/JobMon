package job

import (
	"jobmon/config"
	"time"
)

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
	Data         []JobMetadataData
}

type JobMetadataData struct {
	Config config.MetricConfig
	Data   map[string]float64
}

type StopJob struct {
	StopTime int
}

type JobListData struct {
	Jobs   []JobMetadata
	Config JobListConfig
}

type JobListConfig struct {
	Metrics           []string
	Partitions        []string
	RadarChartMetrics []string
}

func (j *JobMetadata) Expired() bool {
	now := int(time.Now().Unix())
	if j.TTL == 0 {
		return false
	}
	return j.StopTime+j.TTL < now
}
