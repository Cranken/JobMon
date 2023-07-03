package job

import (
	"jobmon/config"
	"math"
	"time"
)

const DEFAULT_MAX_POINTS_PER_JOB = 200

// JobMetadata represents all the metadata of a job.
type JobMetadata struct {
	Id           int `bun:",pk"`
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
	Tags         []*JobTag `bun:"m2m:job_to_tags,join:Job=Tag"`
	Data         []JobMetadataData
}

// JobMetaData represents the job data.
type JobMetadataData struct {
	Config config.MetricConfig
	// Mean
	Data float64
	// Max
	Max float64
	// Change points
	ChangePoints []time.Time
}

// StopJob stores the ExitCode of a job and the end time.
type StopJob struct {
	ExitCode int
	StopTime int
}

// JobListData stores a list of JobMetadata for a specific configuration.
type JobListData struct {
	Jobs   []JobMetadata
	Config JobListConfig
}

// JobListConfig stores metrics, partitions and tags of jobs.
type JobListConfig struct {
	RadarChartMetrics []string
	Partitions        map[string]config.PartitionConfig
	Tags              []JobTag
}

// JobTag represents a job tag, which contains information like tag name, kind and author.
type JobTag struct {
	Id        int64 `bun:",pk,autoincrement"`
	Name      string
	Type      string
	CreatedBy string
}

// JobToTags represents a map that stores job metadata and job tags.
type JobToTags struct {
	JobId int          `bun:",pk"`
	Job   *JobMetadata `bun:"rel:belongs-to,join:job_id=id"`
	TagId int64        `bun:",pk"`
	Tag   *JobTag      `bun:"rel:belongs-to,join:tag_id=id"`
}

// JobFilter represents a job filter with considerable number of parameters.
type JobFilter struct {
	UserId    *int
	UserName  *string
	GroupId   *int
	GroupName *string
	IsRunning *bool
	Partition *string
	NumNodes  *RangeFilter
	NumTasks  *RangeFilter
	NumGpus   *RangeFilter
	Time      *RangeFilter
	Tags      *[]JobTag
}

// RangeFilter represents an integer interval.
type RangeFilter struct {
	From *int
	To   *int
}

// QueryResult represents a map with keys being strings and value any type.
type QueryResult map[string]interface{}

// MetricData stores metric data.
type MetricData struct {
	Config config.MetricConfig
	// Only set when querying parsed raw data
	Data map[string][]QueryResult
	// Only set when querying raw data
	// The raw data is used in the frontend for "export as CSV"
	RawData string
}

// QuantileData similar to MetricData but this one stores data only for the given quantiles.
type QuantileData struct {
	Config    config.MetricConfig
	Quantiles []string
	// Only set when querying parsed raw data
	Data map[string][]QueryResult
	// Only set when querying raw data
	RawData string
}

// JobData stores job metadata, metric data, quantile data etc.
type JobData struct {
	Metadata        *JobMetadata
	MetricData      []MetricData
	QuantileData    []QuantileData
	SampleInterval  float64
	SampleIntervals []float64
}

// Expired checks if job TTL has expired. If TTL == 0 then the job will never expire.
func (j *JobMetadata) Expired() bool {
	now := int(time.Now().Unix())
	if j.TTL == 0 {
		return false
	}
	return j.StopTime+j.TTL < now
}

// Overtime checks if job exceeds given maxTime from its start time until current time.
func (j *JobMetadata) Overtime(maxTime int) bool {
	now := int(time.Now().Unix())
	return j.StartTime+maxTime < now
}

// CalculateSampleIntervals calculates and returns the sample interval which displays
// the closest amount of samples in relation to DEFAULT_MAX_POINTS_PER_JOB.
func (j *JobMetadata) CalculateSampleIntervals(metricSampleInterval time.Duration) ([]float64, time.Duration) {
	defaultIntervals := []float64{30, 60, 120, 300, 600, 1800}
	stopTime := j.StopTime
	if j.IsRunning {
		stopTime = int(time.Now().Unix())
	}
	duration := float64(stopTime - j.StartTime)
	datapoints := duration / metricSampleInterval.Seconds()
	factor := math.Ceil(datapoints / DEFAULT_MAX_POINTS_PER_JOB)
	bestInterval := factor * metricSampleInterval.Seconds()
	bestAvailableInterval := metricSampleInterval.Seconds()
	for _, v := range defaultIntervals {
		if math.Abs(v-bestInterval) < math.Abs(bestAvailableInterval-bestInterval) {
			bestAvailableInterval = v
		}
	}
	intervals := make([]float64, 0)
	for _, v := range defaultIntervals {
		if metricSampleInterval.Seconds() <= v && v <= bestAvailableInterval {
			intervals = append(intervals, v)
		}
	}
	return intervals, time.Duration(bestAvailableInterval) * time.Second
}

// AddTag adds tag to the job j.
func (j *JobMetadata) AddTag(tag *JobTag) {
	for _, jt := range j.Tags {
		if jt == tag {
			return
		}
	}
	j.Tags = append(j.Tags, tag)
}

// RemoveTag removes tag from job j.
func (j *JobMetadata) RemoveTag(tag *JobTag) {
	var newTags []*JobTag
	for _, jt := range j.Tags {
		if jt != tag {
			newTags = append(newTags, jt)
		}
	}
	j.Tags = newTags
}

// IsIn checks of tags belong to the job tag t.
func (t *JobTag) IsIn(tags []*JobTag) bool {
	if tags == nil {
		return false
	}
	for _, jt := range tags {
		if jt.Id == t.Id {
			return true
		}
	}
	return false
}
