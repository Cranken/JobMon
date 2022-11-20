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

export interface JobListData {
  Jobs: JobMetadata[];
  Config: JobListConfig;
}

export interface JobListConfig {
  RadarChartMetrics: string[];
  Partitions: DataMap<PartitionConfig>;
  Tags: JobTag[];
}

export enum CollectionType {
  PerNode,
  PerSocket,
  PerThread,
}

export enum AggFn {
  Mean = "mean",
  Sum = "sum",
  Min = "min",
  Max = "max",
  Empty = ""
}

export interface MetricConfig {
  GUID: string;
  Type: string;
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

export interface QuantilePoint {
  _field: string;
  _measurement: string;
  _time: string;
  _value: number;
}

export interface DataMap<T> {
  [key: string]: T;
}

export interface MetricData {
  Config: MetricConfig;
  Data: DataMap<MetricPoint[]>;
  RawData: string;
}

export interface QuantileData {
  Config: MetricConfig;
  Quantiles: string[];
  Data: DataMap<QuantilePoint[]>;
  RawData: string;
}

export interface JobData {
  Metadata: JobMetadata;
  MetricData: MetricData[];
  QuantileData: QuantileData[];
  SampleInterval: number;
  SampleIntervals: number[];
}
export interface JobMetadataData {
  Config: MetricConfig;
  Data: number;
  Max: number;
}

export interface JobTag {
  Id: number;
  Name: string;
  Type: string;
  CreatedBy: string;
}

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

type RangeFilter = [number | undefined, number | undefined];

export interface PartitionConfig {
  MaxTime: number;
  Metrics: string[];
}

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
