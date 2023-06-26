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
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["_measurement"] == "%s")`, measurement)
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["type"] == "%s")`, metricType)
	fmt.Fprintf(sb, `|> filter(fn: (r) => r["hostname"] =~ /%s/)`, nodes)
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

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, sampleInterval, filterfunc, postQueryOp, sampleInterval
const AggregateMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> aggregateWindow(every: %v, fn: mean, createEmpty: false)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, sampleInterval, filterFunc, postQueryOp, sampleInterval,
// quantile strings, join(tempkeys)
const QuantileMeasurementQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> aggregateWindow(every: %s, fn: mean, createEmpty: false)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
	|> group(columns: ["_time"], mode: "by")
%v
union(tables: %v)
	|> group(columns: ["_field"])
`

// Parameters: streamName, quantile, quantile, measurement
const QuantileStringTemplate = `
%v = data
    |> quantile(column: "_value", q: %v, method: "estimate_tdigest", compression: 1000.0)
    |> set(key: "_field", value: "%v")
    |> set(key: "_measurement", value: "%v_quant")
`

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, filterFunc, postQueryOp
const MetadataMeasurementsQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
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

// Parameters: bucket, measurements regex, type,
// computed value from subMeasurements as string,
// list of columns to drop as a string, each column representing a measurement,
// name of the synthesized measurement
// bucket, organization.
// Deprecated
const SynthesizedMetricsCreationQuery = `
from(bucket: "%v")
	|> range(start: -task.every)
	|> filter(fn: (r) => r["_measurement"] =~ /%v/)
	|> filter(fn: (r) => r["type"] == "%v")
	|> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
	|> map(fn: (r) => ({r with _value: %v}))
	|> drop(columns: [%v])
	|> set(key: "_measurement", value: "%v")
	|> to(bucket: "%v", org: "%v")
`
