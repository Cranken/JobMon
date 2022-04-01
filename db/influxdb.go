package db

import (
	"context"
	"fmt"
	conf "jobmon/config"
	"jobmon/job"
	"log"
	"strings"
	"sync"
	"time"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/influxdata/influxdb-client-go/v2/domain"
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
}

type InfluxDB struct {
	client                influxdb2.Client
	queryAPI              api.QueryAPI
	tasksAPI              api.TasksAPI
	organizationsAPI      api.OrganizationsAPI
	tasks                 []domain.Task
	org                   string
	bucket                string
	metrics               map[string][]conf.MetricConfig
	defaultSampleInterval string
	metricQuantiles       []string
}

type MetricData struct {
	Config conf.MetricConfig
	Data   map[string][]QueryResult
}

type QuantileData struct {
	Config    conf.MetricConfig
	Quantiles []string
	Data      map[string][]QueryResult
}

type JobData struct {
	Metadata        *job.JobMetadata
	MetricData      []MetricData
	QuantileData    []QuantileData
	SampleInterval  float64
	SampleIntervals []float64
}

type QueryResult map[string]interface{}

func (db *InfluxDB) Init(c conf.Configuration) {
	db.client = influxdb2.NewClient(c.DBHost, c.DBToken)
	db.queryAPI = db.client.QueryAPI(c.DBOrg)
	db.tasksAPI = db.client.TasksAPI()
	db.organizationsAPI = db.client.OrganizationsAPI()
	db.bucket = c.DBBucket
	db.org = c.DBOrg
	db.metrics = c.Metrics
	db.defaultSampleInterval = c.SampleInterval
	db.metricQuantiles = c.MetricQuantiles
	go db.updateAggregationTasks()
}

func (db *InfluxDB) Close() {
	db.client.Close()
}

func (db *InfluxDB) GetJobData(job *job.JobMetadata, sampleInterval time.Duration) (data JobData, err error) {
	return db.getJobData(job, db.metrics[job.Partition], "", sampleInterval)
}

func (db *InfluxDB) GetNodeJobData(job *job.JobMetadata, node string, sampleInterval time.Duration) (data JobData, err error) {
	return db.getJobData(job, db.metrics[job.Partition], node, sampleInterval)
}

func (db *InfluxDB) GetJobMetadataMetrics(j *job.JobMetadata) (data []job.JobMetadataData, err error) {
	if j.IsRunning {
		return data, fmt.Errorf("job is still running")
	}
	if j.StopTime <= j.StartTime {
		return data, fmt.Errorf("job stop time is less or equal to start")
	}
	var wg sync.WaitGroup
	for _, m := range db.metrics[j.Partition] {
		wg.Add(1)
		go func(m conf.MetricConfig) {
			defer wg.Done()
			tempRes, err := db.queryMetadataMeasurements(m, j)
			if err != nil {
				log.Printf("Job %v: could not get metadata data %v", j.Id, err)
				return
			}
			result, err := parseQueryResult(tempRes, "_field")
			if err != nil {
				log.Printf("Job %v: could not parse metadata data %v", j.Id, err)
				return
			}
			tempData := make(map[string]float64)
			for _, v := range result {
				for _, qr := range v {
					dat, ok := qr["_value"].(float64)
					if !ok {
						tempData[qr["hostname"].(string)] = 0
					} else {
						tempData[qr["hostname"].(string)] = dat
					}
				}
			}
			data = append(data, job.JobMetadataData{Config: m, Data: tempData})
		}(m)
	}
	wg.Wait()
	return
}

func (db *InfluxDB) getJobData(job *job.JobMetadata, metrics []conf.MetricConfig, node string, sampleInterval time.Duration) (data JobData, err error) {
	if job.IsRunning {
		return data, fmt.Errorf("job is still running")
	}
	var metricData []MetricData
	var quantileData []QuantileData
	var wg sync.WaitGroup
	for _, m := range metrics {
		wg.Add(2)
		go func(m conf.MetricConfig) {
			result, err := db.query(m, job, node, sampleInterval)
			defer wg.Done()
			if err != nil {
				log.Printf("Job %v: could not get metric data %v", job.Id, err)
				return
			}
			metricData = append(metricData, MetricData{Config: m, Data: result})
		}(m)

		go func(m conf.MetricConfig) {
			tempRes, err := db.queryQuantileMeasurement(m, job, db.metricQuantiles, sampleInterval)
			defer wg.Done()
			if err != nil {
				log.Printf("Job %v: could not get quantile data %v", job.Id, err)
				return
			}
			result, err := parseQueryResult(tempRes, "_field")
			if err != nil {
				log.Printf("Job %v: could not parse quantile data %v", job.Id, err)
				return
			}
			quantileData = append(quantileData, QuantileData{Config: m, Data: result, Quantiles: db.metricQuantiles})
		}(m)
	}
	wg.Wait()
	data.MetricData = metricData
	data.QuantileData = quantileData
	data.Metadata = job
	return data, err
}

func (db *InfluxDB) query(metric conf.MetricConfig, job *job.JobMetadata, node string, sampleInterval time.Duration) (result map[string][]QueryResult, err error) {
	var queryResult *api.QueryTableResult
	if metric.AggFn != "" && node == "" {
		queryResult, err = db.queryAggregateMeasurement(metric, job, sampleInterval)
		if err == nil {
			result, err = parseQueryResult(queryResult, "hostname")
		}
	} else if node != "" {
		queryResult, err = db.querySimpleMeasurement(metric, job, node, sampleInterval)
		if err == nil {
			separationKey := "hostname"
			if metric.Type != "node" {
				separationKey = "type-id"
			}
			if metric.SeparationKey != "" {
				separationKey = metric.SeparationKey
			}
			result, err = parseQueryResult(queryResult, separationKey)
		}
	} else {
		queryResult, err = db.querySimpleMeasurement(metric, job, node, sampleInterval)
		if err == nil {
			result, err = parseQueryResult(queryResult, "hostname")
		}
	}
	return result, err
}

func (db *InfluxDB) querySimpleMeasurement(metric conf.MetricConfig, job *job.JobMetadata, node string, sampleInterval time.Duration) (result *api.QueryTableResult, err error) {
	nodeList := job.NodeList
	if node != "" {
		nodeList = node
	}
	query := fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
	  |> filter(fn: (r) => r["type"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
		|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
		%v
		|> truncateTimeColumn(unit: %v)
	`, db.bucket, job.StartTime, job.StopTime, metric.Measurement, metric.Type, nodeList, sampleInterval, metric.FilterFunc, db.defaultSampleInterval)
	query += metric.PostQueryOp
	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at query: %v\n", err)
	}
	return result, err
}

func parseQueryResult(queryResult *api.QueryTableResult, separationKey string) (result map[string][]QueryResult, err error) {
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

	if queryResult.Err() != nil {
		fmt.Printf("query parsing error: %s\n", queryResult.Err().Error())
		return nil, queryResult.Err()
	}
	return
}

func (db *InfluxDB) queryAggregateMeasurement(metric conf.MetricConfig, job *job.JobMetadata, sampleInterval time.Duration) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement + "_" + metric.AggFn
	query := fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
		|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
		%v
	`, db.bucket, job.StartTime, job.StopTime, measurement, job.NodeList, sampleInterval, metric.FilterFunc)
	query += metric.PostQueryOp
	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at query: %v\n", err)
	}
	return
}

func (db *InfluxDB) queryQuantileMeasurement(metric conf.MetricConfig, job *job.JobMetadata, quantiles []string, sampleInterval time.Duration) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement
	if metric.AggFn != "" {
		measurement += "_" + metric.AggFn
	}
	tempKeys := []string{}
	for i := 'A'; i <= 'Z'; i++ {
		tempKeys = append(tempKeys, string(i))
	}

	query := fmt.Sprintf(`
		data = from(bucket: "%v")
			|> range(start: %v, stop: %v)
			|> filter(fn: (r) => r["_measurement"] == "%v")
			|> filter(fn: (r) => r["hostname"] =~ /%v/)
		  |> aggregateWindow(every: %s, fn: mean, createEmpty: true)
			%v
			|> truncateTimeColumn(unit: %v)
			|> group(columns: ["_time"], mode: "by")`,
		db.bucket, job.StartTime, job.StopTime, measurement, job.NodeList, sampleInterval, metric.FilterFunc, db.defaultSampleInterval)

	for i, q := range quantiles {
		query += "\n" + quantileString(tempKeys[i], q, measurement)
	}

	query += "\n" + fmt.Sprintf(`
		union(tables: %v)
		|> group(columns: ["_field"])`, "["+strings.Join(tempKeys[0:len(quantiles)], ",")+"]")
	query += metric.PostQueryOp

	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at quantile query: %v\n", err)
	}
	return
}

func quantileString(streamName string, q string, measurement string) string {
	return fmt.Sprintf(`
		%v = data
    |> quantile(column: "_value", q: %v, method: "estimate_tdigest", compression: 1000.0)
    |> set(key: "_field", value: "%v")
    |> set(key: "_measurement", value: "%v_quant")`,
		streamName, q, q, measurement)
}

func (db *InfluxDB) queryMetadataMeasurements(metric conf.MetricConfig, job *job.JobMetadata) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement
	if metric.AggFn != "" {
		measurement += "_" + metric.AggFn
	}
	query := fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
		%v
	`, db.bucket, job.StartTime, job.StopTime, measurement, job.NodeList, metric.FilterFunc)
	query += metric.PostQueryOp
	query += fmt.Sprintf(`
		|> %v(column: "_value")
    |> group()
	`, "mean")
	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at metadata query: %v\n", err)
	}
	return
}

func (db *InfluxDB) createTask(taskName string, taskStr string, orgId string) (task *domain.Task, err error) {
	task, err = db.tasksAPI.CreateTaskWithEvery(context.Background(), taskName, taskStr, "5m", orgId)
	if err != nil {
		log.Printf("Could not create task: %v\n", err)
		return
	}
	db.tasks = append(db.tasks, *task)
	return
}

func (db *InfluxDB) createAggregationTask(metric conf.MetricConfig, orgId string) (task *domain.Task, err error) {
	measurement := metric.Measurement + "_" + metric.AggFn
	taskName := db.bucket + "_" + metric.Measurement + "_" + metric.AggFn
	sampleInterval := metric.SampleInterval
	if sampleInterval == "" {
		sampleInterval = db.defaultSampleInterval
	}
	query := fmt.Sprintf(`
		from(bucket: "%v")
			|> range(start: -task.every)
			|> filter(fn: (r) => r["_measurement"] == "%v")
			|> filter(fn: (r) => r.type == "%v")
			%v
			|> group(columns: ["_measurement", "hostname"], mode:"by")
			|> aggregateWindow(every: %v, fn: %v, createEmpty: false)
			|> set(key: "_measurement", value: "%v")
			|> set(key: "_field", value: "%v")
			|> to(bucket: "%v", org: "%v")
	`, db.bucket, metric.Measurement, metric.Type, metric.FilterFunc, sampleInterval, metric.AggFn, measurement, measurement, db.bucket, db.org)
	return db.createTask(taskName, query, orgId)
}

func (db *InfluxDB) updateAggregationTasks() (err error) {
	tasks, err := db.tasksAPI.FindTasks(context.Background(), nil)
	if err != nil {
		log.Printf("Could not get tasks from influxdb: %v\n", err)
		return
	}

	missingMetricTasks := []conf.MetricConfig{}
	for _, partition := range db.metrics {
		for _, metric := range partition {
			if metric.AggFn != "" {
				name := db.bucket + "_" + metric.Measurement + "_" + metric.AggFn
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
	}
	org, err := db.organizationsAPI.FindOrganizationByName(context.Background(), db.org)
	if err != nil {
		log.Printf("Could not get orgId from influxdb: %v\n", err)
		return
	}
	for _, metric := range missingMetricTasks {
		go func(metric conf.MetricConfig) {
			_, err = db.createAggregationTask(metric, *org.Id)
		}(metric)
	}
	return
}

func (db *InfluxDB) RunAggregation() {
	for _, task := range db.tasks {
		go func(task *domain.Task) {
			db.tasksAPI.RunManually(context.Background(), task)
		}(&task)
	}
}
