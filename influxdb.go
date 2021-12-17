package main

import (
	"context"
	"fmt"
	"log"
	"sync"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/influxdata/influxdb-client-go/v2/domain"
)

type DB struct {
	client                influxdb2.Client
	queryAPI              api.QueryAPI
	tasksAPI              api.TasksAPI
	organizationsAPI      api.OrganizationsAPI
	tasks                 []domain.Task
	org                   string
	bucket                string
	metrics               []MetricConfig
	defaultSampleInterval string
}

type MetricData struct {
	Config MetricConfig
	Data   map[string][]QueryResult
}

type JobData struct {
	Metadata   JobMetadata
	MetricData []MetricData
}

type QueryResult map[string]interface{}

func (db *DB) Init(c Configuration) {
	db.client = influxdb2.NewClient(c.DBHost, c.DBToken)
	db.queryAPI = db.client.QueryAPI(c.DBOrg)
	db.tasksAPI = db.client.TasksAPI()
	db.organizationsAPI = db.client.OrganizationsAPI()
	db.bucket = c.DBBucket
	db.org = c.DBOrg
	db.metrics = c.Metrics
	db.defaultSampleInterval = c.SampleInterval
	go db.updateAggregationTasks()
}

func (db *DB) Close() {
	db.client.Close()
}

func (db *DB) GetJobData(job JobMetadata) (data JobData, err error) {
	return db.getJobData(job, db.metrics, "")
}

func (db *DB) GetNodeJobData(job JobMetadata, node string) (data JobData, err error) {
	return db.getJobData(job, db.metrics, node)
}

func (db *DB) getJobData(job JobMetadata, metrics []MetricConfig, node string) (data JobData, err error) {
	if job.IsRunning {
		return data, fmt.Errorf("job is still running")
	}
	var metricData []MetricData
	var wg sync.WaitGroup
	for _, m := range metrics {
		wg.Add(1)
		go func(m MetricConfig) {
			result, err := db.query(m, job, node)
			if err == nil {
				metricData = append(metricData, MetricData{Config: m, Data: result})
			}
			defer wg.Done()
		}(m)
	}
	wg.Wait()
	data.MetricData = metricData
	data.Metadata = job
	return data, err
}

func (db *DB) query(metric MetricConfig, job JobMetadata, node string) (result map[string][]QueryResult, err error) {
	var queryResult *api.QueryTableResult
	if metric.AggFn != "" && node == "" {
		queryResult, err = db.queryAggregateMeasurement(metric, job)
		if err == nil {
			result, err = parseSimpleQueryResult(queryResult, "hostname")
		}
	} else if node != "" {
		queryResult, err = db.querySimpleMeasurement(metric, job, node)
		if err == nil {
			separationKey := "hostname"
			if metric.Type != "node" {
				separationKey = "type-id"
			}
			result, err = parseSimpleQueryResult(queryResult, separationKey)
		}
	} else {
		queryResult, err = db.querySimpleMeasurement(metric, job, node)
		if err == nil {
			result, err = parseSimpleQueryResult(queryResult, "hostname")
		}
	}
	return result, err
}

func (db *DB) querySimpleMeasurement(metric MetricConfig, job JobMetadata, node string) (result *api.QueryTableResult, err error) {
	nodeList := job.NodeList
	if node != "" {
		nodeList = node
	}
	result, err = db.queryAPI.Query(context.Background(), fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
	  |> filter(fn: (r) => r["type"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
	`, db.bucket, job.StartTime, job.StopTime, metric.Measurement, metric.Type, nodeList))
	if err != nil {
		log.Printf("Error at query: %v\n", err)
	}
	return result, err
}

func parseSimpleQueryResult(queryResult *api.QueryTableResult, separationKey string) (result map[string][]QueryResult, err error) {
	result = make(map[string][]QueryResult)
	tableRows := []QueryResult{}
	curNode := ""
	tableIndex := int64(0)
	for queryResult.Next() {
		row := queryResult.Record().Values()
		if row["table"].(int64) != tableIndex {
			tableIndex++
			result[curNode] = tableRows
			tableRows = []QueryResult{}
		}
		tableRows = append(tableRows, row)
		curNode = row[separationKey].(string)
	}
	result[curNode] = tableRows

	// check for an error
	if queryResult.Err() != nil {
		fmt.Printf("query parsing error: %s\n", queryResult.Err().Error())
		return nil, queryResult.Err()
	}
	return result, nil
}

func (db *DB) queryAggregateMeasurement(metric MetricConfig, job JobMetadata) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement + "_" + metric.AggFn
	result, err = db.queryAPI.Query(context.Background(), fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
	`, db.bucket, job.StartTime, job.StopTime, measurement, job.NodeList))
	if err != nil {
		log.Printf("Error at query: %v\n", err)
	}
	return result, err
}

func (db *DB) updateAggregationTasks() {
	tasks, err := db.tasksAPI.FindTasks(context.Background(), nil)
	if err != nil {
		log.Printf("Could not get tasks from influxdb: %v\n", err)
		return
	}

	missingMetricTasks := []MetricConfig{}
	for _, metric := range db.metrics {
		if metric.Type != "node" && metric.AggFn != "" {
			name := metric.Measurement + "_" + metric.AggFn
			found := false
			for _, task := range tasks {
				if task.Name == name {
					db.tasks = append(db.tasks, task)
					found = true
					break
				}
			}
			if !found {
				missingMetricTasks = append(missingMetricTasks, metric)
			}
		}
	}
	org, err := db.organizationsAPI.FindOrganizationByName(context.Background(), db.org)
	if err != nil {
		log.Printf("Could not get orgId from influxdb: %v\n", err)
		return
	}
	for _, metric := range missingMetricTasks {
		go db.createAggregationTask(metric, org.Id)
	}
}

func (db *DB) createAggregationTask(metric MetricConfig, orgId *string) {
	taskName := metric.Measurement + "_" + metric.AggFn
	sampleInterval := metric.SampleInterval
	if sampleInterval == "" {
		sampleInterval = db.defaultSampleInterval
	}
	query := fmt.Sprintf(`
		from(bucket: "%v")
			|> range(start: -task.every)
			|> filter(fn: (r) => r["_measurement"] == "%v")
			|> filter(fn: (r) => r.type == "%v")
			|> group(columns: ["_measurement", "hostname"], mode:"by")
			|> aggregateWindow(every: %v, fn: %v, createEmpty: false)
			|> set(key: "_measurement", value: "%v")
			|> set(key: "_field", value: "%v")
			|> to(bucket: "%v", org: "%v")
	`, db.bucket, metric.Measurement, metric.Type, sampleInterval, metric.AggFn, taskName, taskName, db.bucket, db.org)
	task, err := db.tasksAPI.CreateTaskWithEvery(context.Background(), taskName, query, "5m", *orgId)
	if err != nil {
		log.Printf("Could not create task: %v\n", err)
		return
	}
	db.tasks = append(db.tasks, *task)
}

func (db *DB) RunTasks() {
	for _, task := range db.tasks {
		go func(task *domain.Task) {
			db.tasksAPI.RunManually(context.Background(), task)
		}(&task)
	}
}
