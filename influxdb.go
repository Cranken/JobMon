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

func (db *DB) GetJobData(job JobMetadata) (data []MetricData, err error) {
	if job.IsRunning {
		return nil, fmt.Errorf("job is still running")
	}
	var wg sync.WaitGroup
	for _, m := range db.metrics {
		wg.Add(1)
		go func(m MetricConfig) {
			result, err := db.Query(m, job)
			if err == nil {
				data = append(data, MetricData{Config: m, Data: result})
			}
			defer wg.Done()
		}(m)
	}
	wg.Wait()
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (db *DB) Query(metric MetricConfig, job JobMetadata) (result map[string][]QueryResult, err error) {
	switch metric.Type {
	case "socket", "cpu":
		queryResult, err := db.QueryAggregateMeasurement(metric, job)
		if err == nil {
			result = parseSimpleQueryResult(queryResult)
		}
	default:
		queryResult, err := db.QuerySimpleMeasurement(metric, job)
		if err == nil {
			result = parseSimpleQueryResult(queryResult)
		}
	}
	return result, err
}

func (db *DB) QuerySimpleMeasurement(metric MetricConfig, job JobMetadata) (result *api.QueryTableResult, err error) {
	result, err = db.queryAPI.Query(context.Background(), fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
		|> filter(fn: (r) => r["type"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
	`, db.bucket, job.StartTime, job.StopTime, metric.Measurement, metric.Type, job.NodeList))
	if err != nil {
		log.Printf("Error at query: %v\n", err)
	}
	return result, err
}

func parseSimpleQueryResult(queryResult *api.QueryTableResult) (result map[string][]QueryResult) {
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
		curNode = row["hostname"].(string)
	}
	result[curNode] = tableRows

	// check for an error
	if queryResult.Err() != nil {
		fmt.Printf("query parsing error: %s\n", queryResult.Err().Error())
	}
	return result
}

func (db *DB) QueryAggregateMeasurement(metric MetricConfig, job JobMetadata) (result *api.QueryTableResult, err error) {
	sampleInterval := metric.SampleInterval
	if sampleInterval == "" {
		sampleInterval = db.defaultSampleInterval
	}
	result, err = db.queryAPI.Query(context.Background(), fmt.Sprintf(`
	from(bucket: "%v")
		|> range(start: "%v", stop: "%v")
		|> filter(fn: (r) => r["_measurement"] == "%v")
		|> filter(fn: (r) => r["type"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
		|> group(columns: ["_measurement", "hostname"], mode:"by")
		|> aggregateWindow(every: %v, fn: %v)
	`, db.bucket, job.StartTime, job.StopTime, metric.Measurement, metric.Type, job.NodeList, sampleInterval, metric.AggFn))
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

	db.tasks = tasks
	missingMetricTasks := []MetricConfig{}
	for _, metric := range db.metrics {
		if metric.Type != "node" && metric.AggFn != "" {
			name := metric.Measurement + "_" + metric.AggFn
			found := false
			for _, task := range tasks {
				if task.Name == name {
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
	name := metric.Measurement + "_" + metric.AggFn
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
	`, db.bucket, metric.Measurement, metric.Type, sampleInterval, metric.AggFn, name, name, db.bucket, db.org)
	task, err := db.tasksAPI.CreateTaskWithEvery(context.Background(), name, query, "5m", *orgId)
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
