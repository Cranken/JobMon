package router

import (
	"jobmon/job"
)

const (
	WSLoadMetrics         = 1
	WSLoadMetricsResponse = 2
	WSLatestMetrics       = 3
)

type WSMsg struct {
	Type int
}

type WSLoadMetricsMsg struct {
	WSMsg
	StartTime int
	StopTime  int
}

type WSLoadMetricsResponseMsg struct {
	WSMsg
	MetricData []job.MetricData
}

type WSLatestMetricsMsg = WSLoadMetricsResponseMsg
