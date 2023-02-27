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
// type, nodelist, filterfunc, postQueryOp, sampleInterval,
// aggFn, sampleInterval
// Deprecated: This query isn't used anywhere.
const SimpleAggMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["type"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	%v
	%v
	|> group(columns: ["_measurement", "hostname"], mode:"by")
	|> aggregateWindow(every: %v, fn: %v, createEmpty: true)
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, sampleInterval, filterfunc, postQueryOp, sampleInterval
const AggregateMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
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
	|> group(columns: ["hostname"], mode:"by")
	|> keep(
        columns: [
            "hostname",
            "_start",
            "_stop",
            "_time",
            "_value",
            "cluster",
            "hostname",
        ],
    )
	|> set(key: "_measurement", value: "%v")
	|> set(key: "_field", value: "%v")
	|> to(bucket: "%v", org: "%v")
`

////////////////////////////////////////////////////////////////
// The following queries are used as a hack for supporting//
// synthesized metrics for IOPs and MetaOps				  //
////////////////////////////////////////////////////////////

// Parameters: bucket, startTime, stopTime
// _measurement(just a dummy variable to avoid making drastic changes to the query functions.)
// type, nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const IOpsSimpleMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
    |> filter(fn: (r) => r["_measurement"] == "gpfs_num_reads" 
		or r["_measurement"] == "gpfs_num_writes"
		or r["_measurement"] == "%v")
	|> filter(fn: (r) => r["type"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~/"%v"/)
    |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_reads"] + r["gpfs_num_writes"]}))
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime,
// _measurement(just a dummy variable to avoid making drastic changes to the query functions.)
// gpfs_num_closes, gpfs_num_opens, gpfs_num_inode_updates, gpfs_num_readdirs,
// type, nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const MetaOpsSimpleMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
    |> filter(fn: (r) => r["_measurement"] == "gpfs_num_closes" 
		or r["_measurement"] == "gpfs_num_opens" 
		or r["_measurement"] == "gpfs_num_inode_updates" 
		or r["_measurement"] == "gpfs_num_readdirs"
		or r["_measurement"] == "%v")
	|> filter(fn: (r) => r["type"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~/"%v"/)
    |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_closes"] + r["gpfs_num_opens"] + r["gpfs_num_inode_updates"] + r["gpfs_num_readdirs"]}))
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime, measurement,
// gpfs_num_reads and gpfs_num_writes measurements,
// nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const IOpsAggregatedMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "gpfs_num_reads" 
		or r["_measurement"] == "gpfs_num_writes"
		or r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~/"%v"/)
    |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_reads"] + r["gpfs_num_writes"]}))
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime,
// gpfs_num_closes, gpfs_num_opens, gpfs_num_inode_updates, gpfs_num_readdirs,
// type, nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const MetaOpsAggregatedMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "gpfs_num_closes" 
		or r["_measurement"] == "gpfs_num_opens" 
		or r["_measurement"] == "gpfs_num_inode_updates" 
		or r["_measurement"] == "gpfs_num_readdirs"
		or r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~/"%v"/)
    |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_closes"] + r["gpfs_num_opens"] + r["gpfs_num_inode_updates"] + r["gpfs_num_readdirs"]}))
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
`

// Parameters: bucket, startTime, stopTime, measurement,
// gpfs_num_reads and gpfs_num_writes measurements,
// nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const IOpsQQuantileMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "gpfs_num_reads" 
		or r["_measurement"] == "gpfs_num_writes"
		or r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~/"%v"/)
    |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_reads"] + r["gpfs_num_writes"]}))
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
	|> group(columns: ["_time"], mode: "by")
%v
	|> group(columns: ["_field"])
`

// Parameters: bucket, startTime, stopTime,
// type, nodelist, sampleInterval, filterfunc,
// postQueryOp, sampleInterval
const MetaOpsQuantileMeasurementQuery = `
from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["hostname"] =~/"%v"/)
	|> filter(fn: (r) => r["_measurement"] == "gpfs_num_closes" 
		or r["_measurement"] == "gpfs_num_opens" 
		or r["_measurement"] == "gpfs_num_inode_updates" 
		or r["_measurement"] == "gpfs_num_readdirs"
		or r["_measurement"] == "%v")
    |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_closes"] + r["gpfs_num_opens"] + r["gpfs_num_inode_updates"] + r["gpfs_num_readdirs"]}))
	|> aggregateWindow(every: %v, fn: mean, createEmpty: true)
	%v
	%v
	|> truncateTimeColumn(unit: %v)
	|> group(columns: ["_time"], mode: "by")
%v
	|> group(columns: ["_field"])
`

// Parameters: bucket, startTime, stopTime, measurement,
// nodelist, filterFunc, postQueryOp
const IOpsMetadataMeasurementsQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "gpfs_num_reads" 
		or r["_measurement"] == "gpfs_num_writes"
		or r["_measurement"] == "%v")
	|> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
	|> map(fn: (r) => ({r with _value: r["gpfs_num_reads"] + r["gpfs_num_writes"]}))
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
// nodelist, filterFunc, postQueryOp
const MetaOpsMetadataMeasurementsQuery = `
data = from(bucket: "%v")
	|> range(start: %v, stop: %v)
	|> filter(fn: (r) => r["_measurement"] == "gpfs_num_closes" 
		or r["_measurement"] == "gpfs_num_opens" 
		or r["_measurement"] == "gpfs_num_inode_updates" 
		or r["_measurement"] == "gpfs_num_readdirs"
		or r["_measurement"] == "%v")
	|> filter(fn: (r) => r["hostname"] =~ /%v/)
	|> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
    |> map(fn: (r) => ({r with _value: r["gpfs_num_closes"] + r["gpfs_num_opens"] + r["gpfs_num_inode_updates"] + r["gpfs_num_readdirs"]}))
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
