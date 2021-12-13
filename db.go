package main

import (
	"context"
	"fmt"
	"log"
	"sync"

	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
)

type DB struct {
	client   influxdb2.Client
	queryAPI api.QueryAPI
	bucket   string
	metrics  []MetricConfig
}

type MetricData struct {
	Config MetricConfig
	Data   []QueryResult
}

type QueryResult map[string]interface{}

func (db *DB) Init(c Configuration) {
	db.client = influxdb2.NewClient(c.DBHost, c.DBToken)
	db.queryAPI = db.client.QueryAPI(c.DBOrg)
	db.bucket = c.DBBucket
	db.metrics = c.Metrics
}

func (db *DB) Close() {
	db.client.Close()
}

func (db *DB) GetJobData(job JobMetadata) []MetricData {
	if job.IsRunning {
		return nil
	}
	var data []MetricData
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
	return data
}

func (db *DB) Query(metric MetricConfig, job JobMetadata) (result []QueryResult, err error) {
	switch metric.MetricType {
	// case "node":
	default:
		queryResult, err := db.QuerySimpleMeasurement(metric.Measurement, job.StartTime, job.StopTime, job.NodeList)
		if err == nil {
			result = parseQueryResult(queryResult)
		}
		// case "socket":
		// case "cpu":
		// default:
		// 	queryResult, err := db.QuerySimpleMeasurement(metric.Measurement, job.StartTime, job.StopTime, job.NodeList)
	}
	return result, err
}

func (db *DB) QuerySimpleMeasurement(measurement string, start int, stop int, nodes string) (result *api.QueryTableResult, err error) {
	result, err = db.queryAPI.Query(context.Background(), fmt.Sprintf(`
		from(bucket: "%v")
		|> range(start: %v, stop: %v)
		|> filter(fn: (r) => r["_measurement"] == "%v")
		|> filter(fn: (r) => r["hostname"] =~ /%v/)
		|> truncateTimeColumn(unit: 30s)
	`, db.bucket, start, stop, measurement, nodes))
	if err != nil {
		log.Printf("Error at query: %v\n", err)
	}
	return result, err
}

func parseQueryResult(queryResult *api.QueryTableResult) (result []QueryResult) {
	for queryResult.Next() {
		result = append(result, queryResult.Record().Values())
	}
	// check for an error
	if queryResult.Err() != nil {
		fmt.Printf("query parsing error: %s\n", queryResult.Err().Error())
	}
	return result
}
