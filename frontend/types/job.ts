/**
 * JobMetadata represents all the metadata of a job.
 */
export interface JobMetadata {
  Id: number;
  UserId: number;
  UserName: string;
  GroupId: number;
  GroupName: string;
  ClusterId: string;
  NumNodes: number;
  NumTasks: number;
  TasksPerNode: number;
  GPUsPerNode: number;
  NodeList: string;
  StartTime: number;
  StopTime: number;
  IsRunning: boolean;
  JobName: string;
  Account: string;
  Partition: string;
  JobScript: string;
  Tags: JobTag[];
  Data: JobMetadataData[];
}

/**
 * JobListData stores a list of JobMetadata for a specific configuration.
 */
export interface JobListData {
  Jobs: JobMetadata[];
  Config: JobListConfig;
}

/**
 * JobListConfig stores metrics, partitions, and tags of jobs.
 */
export interface JobListConfig {
  RadarChartMetrics: string[];
  Partitions: DataMap<PartitionConfig>;
  Tags: JobTag[];
}


/**
 * CollectionType gives a list of possible aggregation kinds.
 * @deprecated: not used anywhere.
 */
export enum CollectionType {
  PerNode,
  PerSocket,
  PerThread,
}

/**
 * AggFn give a list of possible aggregation functions.
 */
export enum AggFn {
  Mean = "mean",
  Sum = "sum",
  Min = "min",
  Max = "max",
  Empty = ""
}


/**
 * MetricConfig represents a metric configuration, configured by the admin.
 */
export interface MetricConfig {
  GUID: string;
  Type: string;
  Categories: string[];
  Measurement: string;
  AggFn: AggFn;
  AvailableAggFns: string[];
  SampleInterval: string;
  Unit: string;
  DisplayName: string;
  SeparationKey: string;
  MaxPerNode: number;
  MaxPerType: number;
  PThreadAggFn: AggFn;
  FilterFunc: string;
  PostQueryOp: string;
}

/**
 * MetricPoint represents a metric data point on the visualization chart.
 */
export interface MetricPoint {
  _field: string;
  _measurement: string;
  _start: string;
  _stop: string;
  _time: string;
  _value: number;
  cluster: string;
  hostname: string;
  result: string;
  table: number;
  type: string;
  ["type-id"]: string;
  device: string;
}

/**
 * QuantilePoint represents a a metric data point on the visualization chart 
 * which belongs to a given quantile.
 */
export interface QuantilePoint {
  _field: string;
  _measurement: string;
  _time: string;
  _value: number;
}

/**
 * DataMap 
 */
export interface DataMap<T> {
  [key: string]: T;
}


/**
 * MetricData represents a type of objects used for storing metric data.
 */
export interface MetricData {
  Config: MetricConfig;
  Data: DataMap<MetricPoint[]>;
  RawData: string;
}

/**
 * QuantileData, similar to MetricData except that the data is shown only for 
 * a specific qunatile.
 */
export interface QuantileData {
  Config: MetricConfig;
  Quantiles: string[];
  Data: DataMap<QuantilePoint[]>;
  RawData: string;
}

/**
 * JobData is a generalization of the two previous types, the objects of this 
 * type are used for storing all the necessary data that belonging to jobs.
 */
export interface JobData {
  Metadata: JobMetadata;
  MetricData: MetricData[];
  QuantileData: QuantileData[];
  SampleInterval: number;
  SampleIntervals: number[];
}

/**
 * JobMetaData represents a type of objects used for storing job metadata.
 */
export interface JobMetadataData {
  Config: MetricConfig;
  Mean: number;
  Max: number;
  ChangePoints: string[];
}

/**
 * JobTag represents a type of objects used for storing job tags.
 */
export interface JobTag {
  Id: number;
  Name: string;
  Type: string;
  CreatedBy: string;
}

/**
 * JobSearchParams represents job filters.
 */
export interface JobSearchParams {
  UserId?: number;
  UserName?: string;
  GroupId?: number;
  GroupName?: string;
  IsRunning?: boolean;
  Partition?: string;
  NumNodes?: RangeFilter;
  NumTasks?: RangeFilter;
  NumGpus?: RangeFilter;
  Time?: RangeFilter;
  Tags?: JobTag[];
}

/**
 * RangeFilter represents an integer interval.
 */
type RangeFilter = [number | undefined, number | undefined];


/**
 * VirtualPartitionConfig represents virtual partitions which can be built
 * based on a list of nodes and metrics.
 */
export interface VirtualPartitionConfig {
  Metrics: string[] | null;
  Nodes: string[] | null;
}

/**
 * PartitionConfig represents a partition configuration, which stores
 * the maximum time, a list of metrics and virtual partitions.
 */
export interface PartitionConfig {
  MaxTime: number;
  Metrics: string[] | null;
  VirtualPartitions: DataMap<VirtualPartitionConfig> | null;
}

/**
 * WSMsgType TODO:
 */
export enum WSMsgType {
  LoadMetrics = 1,
  LoadMetricsResponse = 2,
  LatestMetrics = 3,
}

export interface WSMsg {
  Type: number;
}


export interface WSLoadMetricsMsg extends WSMsg {
  StartTime: number;
  StopTime?: number;
}

export interface WSLoadMetricsResponse extends WSMsg {
  MetricData: MetricData[];
}

export type WSLatestMetrics = WSLoadMetricsResponse;
