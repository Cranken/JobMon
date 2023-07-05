package db

import (
	"fmt"
	"jobmon/logging"
	"strings"
	"time"
)

// createSimpleMeasurementQuery creates an InfluxDB flux query string
func createSimpleMeasurementQuery(
	bucket string,
	StartTime int, StopTime int,
	measurement string,
	metricType string,
	nodes string,
	sampleInterval time.Duration,
	metricFilterFunc string,
	metricPostQueryOp string,
) (q string) {

	if bucket == "" {
		logging.Error("db: createSimpleMeasurementQuery(): Missing bucket configuration")
		return
	}

	if measurement == "" {
		logging.Error("db: createSimpleMeasurementQuery(): Missing measurement configuration")
		return
	}

	if metricType == "" {
		logging.Error("db: createSimpleMeasurementQuery(): Missing metric type configuration")
		return
	}

	if StartTime < 0 || StopTime < 0 || StartTime >= StopTime {
		logging.Error("db: createSimpleMeasurementQuery(): Wrong start time = ", StartTime, ", StopTime = ", StopTime, " configuration")
		return
	}

	sb := new(strings.Builder)
	fmt.Fprintf(sb, `from(bucket: "%s")`, bucket)
	fmt.Fprintf(sb, `|> range(start: %d, stop: %d)`, StartTime, StopTime)
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s" and  r["type"] == "%s" and r["hostname"] =~ /%s/)`,
		measurement, metricType, nodes)
	if len(metricFilterFunc) > 0 {
		fmt.Fprintf(sb, `%s`, metricFilterFunc)
	}
	if len(metricPostQueryOp) > 0 {
		fmt.Fprintf(sb, `%s`, metricPostQueryOp)
	}
	// Aggregation to sampleInterval after all filtering to aggregate on all metric data available
	fmt.Fprintf(sb, `|> aggregateWindow(every: %v, fn: mean, createEmpty: false)`, sampleInterval)
	// Truncate time to sampleInterval to synchronize measurements from different nodes
	fmt.Fprintf(sb, `|> truncateTimeColumn(unit: %v)`, sampleInterval)
	q = sb.String()

	logging.Debug("db: createSimpleMeasurementQuery(): flux query string = ", q)
	return
}

func createAggregateMeasurementQuery(
	bucket string,
	StartTime int, StopTime int,
	measurement string,
	nodes string,
	sampleInterval time.Duration,
	metricFilterFunc string,
	metricPostQueryOp string,
) (q string) {

	if bucket == "" {
		logging.Error("db: createAggregateMeasurementQuery(): Missing bucket configuration")
		return
	}

	if measurement == "" {
		logging.Error("db: createAggregateMeasurementQuery(): Missing measurement configuration")
		return
	}

	if StartTime < 0 || StopTime < 0 || StartTime >= StopTime {
		logging.Error("db: createAggregateMeasurementQuery(): Wrong start time = ", StartTime, ", StopTime = ", StopTime, " configuration")
		return
	}

	sb := new(strings.Builder)
	fmt.Fprintf(sb, `from(bucket: "%s")`, bucket)
	fmt.Fprintf(sb, `|> range(start: %d, stop: %d)`, StartTime, StopTime)
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s" and r["hostname"] =~ /%s/)`,
		measurement, nodes)
	if len(metricFilterFunc) > 0 {
		fmt.Fprintf(sb, `%s`, metricFilterFunc)
	}
	if len(metricPostQueryOp) > 0 {
		fmt.Fprintf(sb, `%s`, metricPostQueryOp)
	}
	// Aggregation to sampleInterval after all filtering to aggregate on all metric data available
	fmt.Fprintf(sb, `|> aggregateWindow(every: %v, fn: mean, createEmpty: false)`, sampleInterval)
	// Truncate time to sampleInterval to synchronize measurements from different nodes
	fmt.Fprintf(sb, `|> truncateTimeColumn(unit: %v)`, sampleInterval)
	q = sb.String()

	logging.Debug("db: createAggregateMeasurementQuery(): flux query string = ", q)
	return
}

func createQuantileMeasurementQuery(
	bucket string,
	StartTime int, StopTime int,
	measurement string,
	nodes string,
	sampleInterval time.Duration,
	metricFilterFunc string,
	metricPostQueryOp string,
	quantiles []string,
) (q string) {

	if bucket == "" {
		logging.Error("db: createQuantileMeasurementQuery(): Missing bucket configuration")
		return
	}

	if measurement == "" {
		logging.Error("db: createQuantileMeasurementQuery(): Missing measurement configuration")
		return
	}

	if StartTime < 0 || StopTime < 0 || StartTime >= StopTime {
		logging.Error("db: createQuantileMeasurementQuery(): Wrong start time = ", StartTime, ", StopTime = ", StopTime, " configuration")
		return
	}

	sb := new(strings.Builder)
	fmt.Fprintf(sb, `data = from(bucket: "%s")`, bucket)
	fmt.Fprintf(sb, `|> range(start: %d, stop: %d)`, StartTime, StopTime)
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s" and r["hostname"] =~ /%s/)`,
		measurement, nodes)
	if len(metricFilterFunc) > 0 {
		fmt.Fprintf(sb, `%s`, metricFilterFunc)
	}
	if len(metricPostQueryOp) > 0 {
		fmt.Fprintf(sb, `%s`, metricPostQueryOp)
	}
	// Aggregation to sampleInterval after all filtering to aggregate on all metric data available
	fmt.Fprintf(sb, `|> aggregateWindow(every: %v, fn: mean, createEmpty: false)`, sampleInterval)
	// Truncate time to sampleInterval to synchronize measurements from different nodes
	fmt.Fprintf(sb, `|> truncateTimeColumn(unit: %v)`, sampleInterval)
	fmt.Fprintf(sb, `|> group(columns: ["_time"], mode: "by")`)
	fmt.Fprintf(sb, "\n")

	// For each defined quantile create a separate result stream
	streamNames := make([]string, len(quantiles))
	streamName := 'A'
	for i, q := range quantiles {
		streamNames[i] = string(streamName)
		streamName++
		fmt.Fprintf(sb, "%s = data", streamNames[i])
		fmt.Fprintf(sb, `|> quantile(column: "_value", q: %v, method: "estimate_tdigest", compression: 1000.0)`, q)
		fmt.Fprintf(sb, `|> set(key: "_field", value: "%v")`, q)
		fmt.Fprintf(sb, `|> set(key: "_measurement", value: "%v_quant")`, measurement)
		fmt.Fprintf(sb, "\n")
	}

	// Create a union of the separate result stream
	fmt.Fprintf(sb, `union(tables: [%s])`, strings.Join(streamNames, ","))
	fmt.Fprintf(sb, `|> group(columns: ["_field"])`)
	q = sb.String()

	logging.Debug("db: createQuantileMeasurementQuery(): flux query string = ", q)
	return
}

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, filterFunc, postQueryOp
const MetadataMeasurementsQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v" and r["hostname"] =~ /%v/)
	%v
	%v
mean = data
	|> mean(column: "_value")
	|> group()
	|> mean(column: "_value")
	|> set(key: "_field", value: "mean")

max = data
	|> highestMax(n:5, groupColumns: ["_time"])
  	|> median()
  	|> set(key: "_field", value: "max")
	
union(tables: [mean, max])	
`
