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

// InfluxDB represents an InfluxDB object used for storing job data.
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

// Init implements Init method of DB interface.
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

// Close implements Close method of DB interface.
func (db *InfluxDB) Close() {
	db.client.Close()
}

// GetJobData is just a wrapper for getJobData that initializes the nodes parameter
// in case it was not specified.
func (db *InfluxDB) GetJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error) {
	if nodes == "" {
		nodes = j.NodeList
	}
	return db.getJobData(j, nodes, sampleInterval, raw, false)
}

// GetAggregatedJobData similar to GetJobData except that it returns the data for single node jobs.
// Single node jobs also return aggregated data for metrics with metric granularity finer than per node.
func (db *InfluxDB) GetAggregatedJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool) (data job.JobData, err error) {
	if nodes == "" {
		nodes = j.NodeList
	}
	return db.getJobData(j, nodes, sampleInterval, raw, true)
}

// GetJobMetadataMetrics returns the metadata metrics data for job j.
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

// GetMetricDataWithAggFn returns the the metric-data data for job j based on the configuration m
// and aggregated by function aggFn.
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

// RunAggregation runs the aggregation for node data in the db.
func (db *InfluxDB) RunAggregation() {
	for _, task := range db.tasks {
		go func(task *domain.Task) {
			db.tasksAPI.RunManually(context.Background(), task)
		}(&task)
	}
}

// CreateLiveMonitoringChannel creates a channel which periodically returns
// the latest metric data for the given job. Also it returns a channel
// which can be used to send a close signal.
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

// getJobData returns the data for job j for the given nodes and sampleInterval.
// If raw is true then the MetricData contained in the result data contains the raw metric data.
// Nodes should be specified as a list of nodes separated by a '|' character.
// If no nodes are specified, data for all nodes are queried.
func (db *InfluxDB) getJobData(j *job.JobMetadata, nodes string, sampleInterval time.Duration, raw bool, forceAggregate bool) (data job.JobData, err error) {
	var metricData []job.MetricData
	var quantileData []job.QuantileData
	var wg sync.WaitGroup
	for _, m := range db.getPartition(j).Metrics {
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

// getMetadataData returns the metadata data for job j.
func (db *InfluxDB) getMetadataData(j *job.JobMetadata) (data []job.JobMetadataData, err error) {
	var wg sync.WaitGroup
	for _, m := range db.getPartition(j).Metrics {
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
				md := job.JobMetadataData{Config: m}
				if len(res) >= 1 {
					mean := res[0]["_value"]
					switch v := mean.(type) {
					case float64:
						md.Data = v
					default:
					}
				}
				if len(res) >= 2 {
					max := res[1]["_value"]
					switch v := max.(type) {
					case float64:
						md.Max = v
					default:
					}
				}
				data = append(data, md)
			}
		}(db.metrics[m])
	}
	wg.Wait()
	return
}

// query returns result which is a map with keys being the separation key and values being the table that
// corresponds to the job j, list of nodes "nodes", within the sample interval
// sampleInterval for the metric "metric".
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

// queryRaw checks if the metric.Type is "node", if that's the case then it calls the function queryAggregateMeasurementRaw
// otherwise it calls querySimpleMeasurementRaw.
func (db *InfluxDB) queryRaw(metric conf.MetricConfig, j *job.JobMetadata, node string, sampleInterval time.Duration, forceAggregate bool) (result string, err error) {
	if metric.Type != "node" && forceAggregate {
		result, err = db.queryAggregateMeasurementRaw(metric, j, node, metric.AggFn, sampleInterval)
	} else {
		result, err = db.querySimpleMeasurementRaw(metric, j, node, sampleInterval)
	}
	return result, err
}

// querySimpleMeasurement returns a flux table result corresponding to a simple query based on the
// given parameters.
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

// querySimpleMeasurementRaw is similar to querySimpleMeasurement except that this one returns the table as string,
// with table annotations according to dialect.
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

// parseQueryResult returns result which is a map with keys separation key(or the empty string) and values slices
// of job.QueryResult. The function parses queryResult using the separationKey.
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

// queryAggregateMeasurement is similar to querySimpleMeasurement except that here an aggregation
// over the metric type is performed.
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

// queryAggregateMeasurementRaw is similar to querySimpleMeasurementRaw except that here an aggregation
// over the metric type is performed.
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

// queryQuantileMeasurement is similar to querySimpleMeasurement except that here the query is extended with quantiles.
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

// quantileString returns a string which is a database query generated for
// the parameters streamName,q and measurement.
func quantileString(streamName string, q string, measurement string) string {
	return fmt.Sprintf(QuantileStringTemplate,
		streamName, q, q, measurement)
}

// queryMetadataMeasurements returns the flux database table containing
// the metadata measurements for metric 'metric' and job j.
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

// queryLastDatapoints returns a slice of metricData metricData for job j.
func (db *InfluxDB) queryLastDatapoints(j job.JobMetadata) (metricData []job.MetricData, err error) {
	var wg sync.WaitGroup
	if j.IsRunning {
		j.StopTime = int(time.Now().Unix())
	}
	sampleInterval, err := time.ParseDuration(db.defaultSampleInterval)
	if err != nil {
		sampleInterval = 30 * time.Second
	}
	for _, m := range db.getPartition(&j).Metrics {
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

// createTask appends task with name taskName, with query taskStr and id orgID to db.task.
func (db *InfluxDB) createTask(taskName string, taskStr string, orgId string) (task *domain.Task, err error) {
	task, err = db.tasksAPI.CreateTaskWithEvery(context.Background(), taskName, taskStr, "1m", orgId)
	if err != nil {
		log.Printf("Could not create task: %v\n", err)
		return
	}
	db.tasks = append(db.tasks, *task)
	return
}

// createAggregationTasks calls the function createTasks where the query is built on top
// of the metric, aggFn and orgID arguments.
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

// updateAggregationTask finds first all the missing tasks for job metrics.
// then for each metric find the available aggregation functions adding this tasks
// to db, finally it launches an aggregation task for each missing metric.
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

// getPartition returns a partition configuration for job j.
func (db *InfluxDB) getPartition(j *job.JobMetadata) conf.BasePartitionConfig {
	nodes := strings.Split(j.NodeList, "|")
	for _, vp := range db.partitionConfig[j.Partition].VirtualPartitions {
		matches := true
		for _, n := range nodes {
			if !utils.Contains(vp.Nodes, n) {
				matches = false
				break
			}
		}
		if matches {
			return vp.BasePartitionConfig
		}
	}
	return db.partitionConfig[j.Partition].BasePartitionConfig
}
