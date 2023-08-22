package db

import (
	"fmt"
	"jobmon/job"
	"jobmon/logging"
	"strings"
	"time"
)

// createSimpleMeasurementQuery creates an flux query string to query an InfluxDB
// The query contains:
// * a filter by time range
// * a filter by measurement
// * an optional filter by type
// * a filter by nodes / host names
// * an optional additional metric filter function
// * optional post query operations
// Query result is aggregated and truncated to duration "sample interval"
func createSimpleMeasurementQuery(
	bucket string,
	StartTime int, StopTime int,
	measurement string,
	metricType string,
	nodes string,
	sampleInterval time.Duration,
	metricFilterFunc string,
	metricPostQueryOp string,
) (
	q string,
) {

	if bucket == "" {
		logging.Error("db: createSimpleMeasurementQuery(): Missing bucket configuration")
		return
	}

	if measurement == "" {
		logging.Error("db: createSimpleMeasurementQuery(): Missing measurement configuration")
		return
	}

	if StartTime < 0 || StopTime < 0 || StartTime >= StopTime {
		logging.Error("db: createSimpleMeasurementQuery(): Wrong start time = ", StartTime, ", StopTime = ", StopTime, " configuration")
		return
	}

	sb := new(strings.Builder)
	fmt.Fprintf(sb, `from(bucket: "%s")`, bucket)
	fmt.Fprintf(sb, `|> range(start: %d, stop: %d)`, StartTime, StopTime)
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s")`, measurement)
	if metricType != "" {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["type"] == "%s")`, metricType)
	}
	if strings.Contains(nodes, "|") {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] =~ /^(%s)$/)`, nodes)
	} else {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] == "%s")`, nodes)
	}

	if len(metricFilterFunc) > 0 {
		fmt.Fprintf(sb, `%s`, metricFilterFunc)
	}
	if len(metricPostQueryOp) > 0 {
		fmt.Fprintf(sb, `%s`, metricPostQueryOp)
	}
	// Aggregation to sampleInterval after all filtering to aggregate on all metric data available
	// https://docs.influxdata.com/flux/v0.x/stdlib/universe/mean/
	fmt.Fprintf(sb, `|> aggregateWindow(every: %v, fn: mean, createEmpty: false)`, sampleInterval)
	// Truncate time to sampleInterval to synchronize measurements from different nodes
	fmt.Fprintf(sb, `|> truncateTimeColumn(unit: %v)`, sampleInterval)
	q = sb.String()

	logging.Debug("db: createSimpleMeasurementQuery(): flux query string = ", q)
	return
}

// createAggregateMeasurementQuery creates an flux query string to query an InfluxDB
// It is similar to createSimpleMeasurementQuery except that here an aggregation over the metric type is performed.
// The query contains:
// * a filter by time range
// * a filter by measurement
// * a filter by nodes / host names
// * an optional additional metric filter function
// * optional post query operations
// Query result is aggregated and truncated to duration "sample interval"
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
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s")`, measurement)
	if strings.Contains(nodes, "|") {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] =~ /^(%s)$/)`, nodes)
	} else {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] == "%s")`, nodes)
	}
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
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s")`, measurement)
	if strings.Contains(nodes, "|") {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] =~ /^(%s)$/)`, nodes)
	} else {
		fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] == "%s")`, nodes)
	}
	if len(metricFilterFunc) > 0 {
		fmt.Fprintf(sb, `%s`, metricFilterFunc)
	}
	if len(metricPostQueryOp) > 0 {
		fmt.Fprintf(sb, `%s`, metricPostQueryOp)
	}
	// Un-group all measurements
	fmt.Fprintf(sb, `|> group()`)
	fmt.Fprintf(sb, "\n")

	// For each defined quantile create a separate result stream
	streamNames := make([]string, len(quantiles))
	streamName := 'A'
	for i, q := range quantiles {
		streamNames[i] = string(streamName)
		streamName++
		fmt.Fprintf(sb, "%s = data", streamNames[i])
		// Aggregation to sampleInterval after all filtering to aggregate on all metric data available
		// Use quantile as aggregation function
		// See: https://docs.influxdata.com/flux/v0.x/stdlib/universe/quantile/
		fmt.Fprintf(sb, `|> aggregateWindow(every: %v, fn: (tables=<-, column) => tables |> quantile(column: "_value", q: %s, method: "estimate_tdigest", compression: 1000.0), createEmpty: false)`, sampleInterval, q)
		// Truncate time to sampleInterval to synchronize measurements from different nodes
		fmt.Fprintf(sb, `|> truncateTimeColumn(unit: %v)`, sampleInterval)
		fmt.Fprintf(sb, `|> set(key: "_field", value: "%s")`, q)
		fmt.Fprintf(sb, `|> set(key: "_measurement", value: "%s_quant")`, measurement)
		fmt.Fprintf(sb, "\n")
	}

	// Create a union of the separate result stream
	fmt.Fprintf(sb, `union(tables: [%s])`, strings.Join(streamNames, ","))
	fmt.Fprintf(sb, `|> group(columns: ["_field"])`)
	q = sb.String()

	logging.Debug("db: createQuantileMeasurementQuery(): flux query string = ", q)
	return
}

// Creates a string of nodes as required by the database
func createNodeString(nodes []*job.Node) (nodesString string) {
	if len(nodes) == 0 {
		return
	}
	nodesString = nodes[0].Name

	for _, n := range nodes[1:] {
		nodesString += "|"
		nodesString += n.Name
	}
	logging.Debug("db: createNodeString: Nodes string = ", nodesString)
	return
}

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, filterFunc, postQueryOp
const MetadataMeasurementsQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /^(%v)$/)
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
