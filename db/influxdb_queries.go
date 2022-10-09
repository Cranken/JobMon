package db

// Parameters: bucket, startTime, stopTime, measurement,
// type, nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const SimpleMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["type"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, sampleInterval, filterfunc, postQueryOp
const AggregateMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
`

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, sampleInterval, filterFunc, postQueryOp, sampleInterval,
// quantile strings, join(tempkeys)
const QuantileMeasurementQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> aggregateWindow(every: %s, fn: mean, createEmpty: true)
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

// Parameters: bucket, startTime, stopTime, measurement,
// type, filterFunc, postQueryOp, sampleInterval, aggFn
// measurement, measurement, bucket, org
const AggregationTaskQuery = `
from(bucket: "%v")
	|> range(start: -task.every)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r.type == "%v")
	%v
	%v
	|> group(columns: ["_measurement", "hostname"], mode:"by")
	|> aggregateWindow(every: %v, fn: %v, createEmpty: false)
	|> set(key: "_measurement", value: "%v")
	|> set(key: "_field", value: "%v")
	|> to(bucket: "%v", org: "%v")
`
