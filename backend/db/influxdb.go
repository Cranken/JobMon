package db

import (
	"context"
	"fmt"
	"jobmon/analysis"
	conf "jobmon/config"
	"jobmon/job"
	"jobmon/utils"
	"log"
	"strings"
	"sync"
	"time"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/influxdata/influxdb-client-go/v2/domain"
)

type InfluxDB struct {
	client                influxdb2.Client
	queryAPI              api.QueryAPI
	tasksAPI              api.TasksAPI
	organizationsAPI      api.OrganizationsAPI
	tasks                 []domain.Task
	org                   string
	bucket                string
	metrics               map[string]conf.MetricConfig
	partitionConfig       map[string]conf.PartitionConfig
	defaultSampleInterval string
	metricQuantiles       []string
}

func (db *InfluxDB) Init(c conf.Configuration) {
	if c.DBHost == "" {
		log.Fatalln("db: No Influxdb host set")
	}
	if c.DBToken == "" {
		log.Fatalln("db: No Influxdb token set")
	}
	db.client = influxdb2.NewClient(c.DBHost, c.DBToken)
	ok, err := db.client.Ping(context.Background())
	if !ok || err != nil {
		log.Fatalf("db: Could not reach influxdb %v", err)
	}
	if c.DBOrg == "" {
		log.Fatalln("db: No Influxdb org set")
	}
	db.queryAPI = db.client.QueryAPI(c.DBOrg)
	db.tasksAPI = db.client.TasksAPI()
	db.organizationsAPI = db.client.OrganizationsAPI()
	if c.DBBucket == "" {
		log.Fatalln("db: No Influxdb bucket set")
	}
	db.bucket = c.DBBucket
	db.org = c.DBOrg
	db.metrics = make(map[string]conf.MetricConfig)
	for _, mc := range c.Metrics {
		db.metrics[mc.GUID] = mc
	}
	db.partitionConfig = c.Partitions
	db.defaultSampleInterval = c.SampleInterval
	db.metricQuantiles = c.MetricQuantiles
	go db.updateAggregationTasks()
}

func (db *InfluxDB) Close() {
	db.client.Close()
}

func (db *InfluxDB) GetJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error) {
	if nodes == "" {
		nodes = j.NodeList
	}
	return db.getJobData(j, nodes, sampleInterval, raw, false)
}

func (db *InfluxDB) GetAggregatedJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error) {
	if nodes == "" {
		nodes = j.NodeList
	}
	return db.getJobData(j, nodes, sampleInterval, raw, true)
}

func (db *InfluxDB) GetJobMetadataMetrics(j *job.JobMetadata) (data []job.JobMetadataData, err error) {
	if j.IsRunning {
		return data, fmt.Errorf("job is still running")
	}
	if j.StopTime <= j.StartTime {
		return data, fmt.Errorf("job stop time is less or equal to start")
	}
	data, err = db.getMetadataData(j)
	if err != nil {
		return data, err
	}
	s, err := time.ParseDuration(db.defaultSampleInterval)
	if err != nil {
		return data, err
	}
	_, interval := j.CalculateSampleIntervals(s)
	aggData, err := db.getJobData(j, j.NodeList, interval, false, true)
	cps := analysis.ChangePointDetection(&aggData)
	for i, md := range data {
		md.ChangePoints = cps[md.Config.Measurement]
		data[i] = md
	}

	return
}

func (db *InfluxDB) GetMetricDataWithAggFn(j *job.JobMetadata, m conf.MetricConfig, aggFn string, sampleInterval time.Duration) (data job.MetricData, err error) {
	tempRes, err := db.queryAggregateMeasurement(m, j, j.NodeList, aggFn, sampleInterval)
	if err != nil {
		log.Printf("Job %v: could not get quantile data %v", j.Id, err)
		return
	}

	result, err := parseQueryResult(tempRes, "hostname")
	if err != nil {
		log.Printf("Job %v: could not parse quantile data %v", j.Id, err)
		return
	}
	m.AggFn = aggFn
	data = job.MetricData{Data: result, Config: m}
	return data, nil
}

func (db *InfluxDB) RunAggregation() {
	for _, task := range db.tasks {
		go func(task *domain.Task) {
			db.tasksAPI.RunManually(context.Background(), task)
		}(&task)
	}
}

func (db *InfluxDB) CreateLiveMonitoringChannel(j *job.JobMetadata) (chan []job.MetricData, chan bool) {
	duration, err := time.ParseDuration(db.defaultSampleInterval)
	if err != nil {
		duration = 30 * time.Second
	}
	monitor := make(chan []job.MetricData)
	done := make(chan bool)
	ticker := time.NewTicker(duration)

	liveJ := *j
	go func() {
		for {
			select {
			case <-ticker.C:
				data, err := db.queryLastDatapoints(liveJ)
				if err != nil {
					log.Printf("error getting job data for live monitoring: %v", err)
					continue
				}
				monitor <- data
			case <-done:
				ticker.Stop()
				close(done)
				close(monitor)
				return
			}
		}
	}()
	return monitor, done
}

func (db *InfluxDB) getJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool, forceAggregate bool) (data job.JobData, err error) {
	var metricData []job.MetricData
	var quantileData []job.QuantileData
	var wg sync.WaitGroup
	for _, m := range db.partitionConfig[j.Partition].Metrics {
		wg.Add(1)
		go func(m conf.MetricConfig) {
			if raw {
				defer wg.Done()
				result, err := db.queryRaw(m, j, nodes, sampleInterval, forceAggregate)
				if err != nil {
					log.Printf("Job %v: could not get metric data %v", j.Id, err)
					return
				}
				metricData = append(metricData, job.MetricData{Config: m, RawData: result})
			} else {
				defer wg.Done()
				result, err := db.query(m, j, nodes, sampleInterval, forceAggregate)
				if err != nil {
					log.Printf("Job %v: could not get metric data %v", j.Id, err)
					return
				}
				metricData = append(metricData, job.MetricData{Config: m, Data: result})
			}
		}(db.metrics[m])

		if !j.IsRunning {
			wg.Add(1)
			go func(m conf.MetricConfig) {
				defer wg.Done()
				tempRes, err := db.queryQuantileMeasurement(m, j, db.metricQuantiles, sampleInterval)
				if err != nil {
					log.Printf("Job %v: could not get quantile data %v", j.Id, err)
					return
				}
				result, err := parseQueryResult(tempRes, "_field")
				if err != nil {
					log.Printf("Job %v: could not parse quantile data %v", j.Id, err)
					return
				}
				quantileData = append(quantileData, job.QuantileData{Config: m, Data: result, Quantiles: db.metricQuantiles})
			}(db.metrics[m])
		}
	}
	wg.Wait()
	data.MetricData = metricData
	data.QuantileData = quantileData
	data.Metadata = j
	return data, err
}

func (db *InfluxDB) getMetadataData(j *job.JobMetadata) (data []job.JobMetadataData, err error) {
	var wg sync.WaitGroup
	for _, m := range db.partitionConfig[j.Partition].Metrics {
		wg.Add(1)
		go func(m conf.MetricConfig) {
			defer wg.Done()
			tempRes, err := db.queryMetadataMeasurements(m, j)
			if err != nil {
				log.Printf("Job %v: could not get metadata data %v", j.Id, err)
				return
			}

			result, err := parseQueryResult(tempRes, "result")
			if err != nil {
				log.Printf("Job %v: could not parse metadata data %v", j.Id, err)
				return
			}

			if res, ok := result["_result"]; ok {
				mean := res[0]["_value"]
				max := res[1]["_value"]
				if mean != nil && max != nil {
					data = append(data, job.JobMetadataData{Config: m, Data: mean.(float64), Max: max.(float64)})
				}
			}
		}(db.metrics[m])
	}
	wg.Wait()
	return
}

func (db *InfluxDB) query(metric conf.MetricConfig, j *job.JobMetadata, nodes string, sampleInterval time.Duration, forceAggregate bool) (result map[string][]job.QueryResult, err error) {
	var queryResult *api.QueryTableResult
	separationKey := metric.SeparationKey
	// If only one node is specified, always return detailed data, never aggregated data
	if len(strings.Split(nodes, "|")) == 1 && !forceAggregate {
		queryResult, err = db.querySimpleMeasurement(metric, j, nodes, sampleInterval)
	} else {
		if metric.Type != "node" {
			queryResult, err = db.queryAggregateMeasurement(metric, j, nodes, metric.AggFn, sampleInterval)
		} else {
			queryResult, err = db.querySimpleMeasurement(metric, j, nodes, sampleInterval)
		}
		separationKey = "hostname"
	}
	if err == nil {
		result, err = parseQueryResult(queryResult, separationKey)
	}
	return result, err
}

func (db *InfluxDB) queryRaw(metric conf.MetricConfig, j *job.JobMetadata, node string, sampleInterval time.Duration, forceAggregate bool) (result string, err error) {
	if metric.Type != "node" && forceAggregate {
		result, err = db.queryAggregateMeasurementRaw(metric, j, node, metric.AggFn, sampleInterval)
	} else {
		result, err = db.querySimpleMeasurementRaw(metric, j, node, sampleInterval)
	}
	return result, err
}

func (db *InfluxDB) querySimpleMeasurement(metric conf.MetricConfig, j *job.JobMetadata, nodes string, sampleInterval time.Duration) (result *api.QueryTableResult, err error) {
	query := fmt.Sprintf(SimpleMeasurementQuery,
		db.bucket, j.StartTime, j.StopTime, metric.Measurement,
		metric.Type, nodes, sampleInterval, metric.FilterFunc,
		metric.PostQueryOp, sampleInterval)
	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at simple query: %v : %v\n", query, err)
	}
	return result, err
}

func (db *InfluxDB) querySimpleMeasurementRaw(metric conf.MetricConfig, j *job.JobMetadata, nodes string, sampleInterval time.Duration) (result string, err error) {
	query := fmt.Sprintf(SimpleMeasurementQuery,
		db.bucket, j.StartTime, j.StopTime, metric.Measurement,
		metric.Type, nodes, sampleInterval, metric.FilterFunc,
		metric.PostQueryOp, sampleInterval)
	result, err = db.queryAPI.QueryRaw(context.Background(), query, api.DefaultDialect())
	if err != nil {
		log.Printf("Error at simple raw query: %v : %v\n", query, err)
	}
	return result, err
}

// separationKey describes the key by which to differentiate between different datasets. E.g. per host/per cpu
func parseQueryResult(queryResult *api.QueryTableResult, separationKey string) (result map[string][]job.QueryResult, err error) {
	result = make(map[string][]job.QueryResult)
	tableRows := []job.QueryResult{}
	curNode := ""
	tableIndex := int64(0)
	for queryResult.Next() {
		row := queryResult.Record().Values()
		if row["table"].(int64) != tableIndex {
			tableIndex++
			result[curNode] = tableRows
			tableRows = []job.QueryResult{}
		} else if curNode != "" && curNode != row[separationKey].(string) {
			result[curNode] = tableRows
			tableRows = []job.QueryResult{}
		}
		tableRows = append(tableRows, row)
		if val, ok := row[separationKey]; ok {
			curNode = val.(string)
		} else {
			return nil, fmt.Errorf("could not parse query result %v with separation key %v", row, separationKey)
		}
	}
	result[curNode] = tableRows

	if queryResult.Err() != nil {
		fmt.Printf("query parsing error: %s\n", queryResult.Err().Error())
		return nil, queryResult.Err()
	}
	return
}

func (db *InfluxDB) queryAggregateMeasurement(metric conf.MetricConfig, j *job.JobMetadata, nodes string, aggFn string, sampleInterval time.Duration) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement + "_" + aggFn
	query := fmt.Sprintf(AggregateMeasurementQuery,
		db.bucket, j.StartTime, j.StopTime, measurement,
		nodes, sampleInterval, metric.FilterFunc, metric.PostQueryOp, sampleInterval)
	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at aggregate query: %v\n", err)
	}
	return
}

func (db *InfluxDB) queryAggregateMeasurementRaw(metric conf.MetricConfig, j *job.JobMetadata, nodes string, aggFn string, sampleInterval time.Duration) (result string, err error) {
	measurement := metric.Measurement + "_" + aggFn
	query := fmt.Sprintf(AggregateMeasurementQuery,
		db.bucket, j.StartTime, j.StopTime, measurement,
		nodes, sampleInterval, metric.FilterFunc, metric.PostQueryOp, sampleInterval)
	result, err = db.queryAPI.QueryRaw(context.Background(), query, api.DefaultDialect())
	if err != nil {
		log.Printf("Error at aggregate raw query: %v\n", err)
	}
	return
}

func (db *InfluxDB) queryQuantileMeasurement(metric conf.MetricConfig, j *job.JobMetadata, quantiles []string, sampleInterval time.Duration) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement
	filterFunc := metric.FilterFunc
	if metric.AggFn != "" {
		measurement += "_" + metric.AggFn
		filterFunc = ""
	}
	tempKeys := []string{}
	for i := 'A'; i <= 'Z'; i++ {
		tempKeys = append(tempKeys, string(i))
	}

	quantileSubQuery := ""
	for i, q := range quantiles {
		quantileSubQuery += quantileString(tempKeys[i], q, measurement) + "\n"
	}

	tempKeyAggregation := "[" + strings.Join(tempKeys[0:len(quantiles)], ",") + "]"

	query := fmt.Sprintf(QuantileMeasurementQuery,
		db.bucket, j.StartTime, j.StopTime, measurement,
		j.NodeList, sampleInterval, filterFunc, metric.PostQueryOp,
		sampleInterval, quantileSubQuery, tempKeyAggregation)

	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at quantile query: %v\n", err)
	}
	return
}

func quantileString(streamName string, q string, measurement string) string {
	return fmt.Sprintf(QuantileStringTemplate,
		streamName, q, q, measurement)
}

func (db *InfluxDB) queryMetadataMeasurements(metric conf.MetricConfig, j *job.JobMetadata) (result *api.QueryTableResult, err error) {
	measurement := metric.Measurement
	if metric.AggFn != "" {
		measurement += "_" + metric.AggFn
	}
	query := fmt.Sprintf(MetadataMeasurementsQuery,
		db.bucket, j.StartTime, j.StopTime, measurement,
		j.NodeList, metric.FilterFunc, metric.PostQueryOp)
	result, err = db.queryAPI.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error at metadata query: %v\n", err)
	}
	return
}

func (db *InfluxDB) queryLastDatapoints(j job.JobMetadata) (metricData []job.MetricData, err error) {
	var wg sync.WaitGroup
	if j.IsRunning {
		j.StopTime = int(time.Now().Unix())
	}
	sampleInterval, err := time.ParseDuration(db.defaultSampleInterval)
	if err != nil {
		sampleInterval = 30 * time.Second
	}
	for _, m := range db.partitionConfig[j.Partition].Metrics {
		wg.Add(1)
		go func(m conf.MetricConfig) {
			defer wg.Done()
			m.PostQueryOp += "|> last()"
			var queryResult *api.QueryTableResult
			separationKey := "hostname"
			if j.NumNodes == 1 {
				queryResult, err = db.querySimpleMeasurement(m, &j, j.NodeList, sampleInterval)
				separationKey = m.SeparationKey
			} else {
				queryResult, err = db.queryAggregateMeasurement(m, &j, j.NodeList, m.AggFn, sampleInterval)
			}
			if err != nil {
				log.Printf("Job %v: could not get last datapoints %v", j.Id, err)
				return
			}
			if err == nil {
				result, err := parseQueryResult(queryResult, separationKey)
				if err != nil {
					log.Printf("Job %v: could not parse last datapoints %v", j.Id, err)
					return
				}
				metricData = append(metricData, job.MetricData{Config: m, Data: result})
			}
		}(db.metrics[m])
	}
	wg.Wait()
	return
}

func (db *InfluxDB) createTask(taskName string, taskStr string, orgId string) (task *domain.Task, err error) {
	task, err = db.tasksAPI.CreateTaskWithEvery(context.Background(), taskName, taskStr, "1m", orgId)
	if err != nil {
		log.Printf("Could not create task: %v\n", err)
		return
	}
	db.tasks = append(db.tasks, *task)
	return
}

func (db *InfluxDB) createAggregationTask(metric conf.MetricConfig, aggFn string, orgId string) (task *domain.Task, err error) {
	measurement := metric.Measurement + "_" + aggFn
	taskName := db.bucket + "_" + metric.Measurement + "_" + aggFn
	sampleInterval := metric.SampleInterval
	if sampleInterval == "" {
		sampleInterval = db.defaultSampleInterval
	}
	query := fmt.Sprintf(AggregationTaskQuery,
		db.bucket, metric.Measurement, metric.Type, metric.FilterFunc,
		metric.PostQueryOp, sampleInterval, aggFn,
		measurement, measurement, db.bucket, db.org)
	return db.createTask(taskName, query, orgId)
}

func (db *InfluxDB) updateAggregationTasks() (err error) {
	tasks, err := db.tasksAPI.FindTasks(context.Background(), nil)
	if err != nil {
		log.Printf("Could not get tasks from influxdb: %v\n", err)
		return
	}

	missingMetricTasks := make([]utils.Tuple[conf.MetricConfig, string], 0)
	for _, metric := range db.metrics {
		for _, aggFn := range metric.AvailableAggFns {
			name := db.bucket + "_" + metric.Measurement + "_" + aggFn
			found := false
			for _, task := range tasks {
				if task.Name == name {
					db.tasks = append(db.tasks, task)
					found = true
					break
				}
			}
			if !found {
				missingMetricTasks = append(missingMetricTasks, utils.Tuple[conf.MetricConfig, string]{First: metric, Second: aggFn})
			}
		}
	}
	org, err := db.organizationsAPI.FindOrganizationByName(context.Background(), db.org)
	if err != nil {
		log.Printf("Could not get orgId from influxdb: %v\n", err)
		return
	}
	for _, metric := range missingMetricTasks {
		go func(metric conf.MetricConfig, aggFn string) {
			_, err = db.createAggregationTask(metric, aggFn, *org.Id)
		}(metric.First, metric.Second)
	}
	return
}
