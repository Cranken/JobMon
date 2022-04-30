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
  Metrics: string[];
  RadarChartMetrics: string[];
}

export enum CollectionType {
  PerNode,
  PerSocket,
  PerThread,
}

type PThreadAggFn = "mean" | "sum";

export interface MetricConfig {
  Type: string;
  Measurement: string;
  AggFn: string;
  SampleInterval: string;
  Unit: string;
  DisplayName: string;
  SeparationKey: string;
  MaxPerNode: number;
  MaxPerType: number;
  PThreadAggFn: PThreadAggFn;
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
}

export interface QuantileData {
  Config: MetricConfig;
  Quantiles: string[];
  Data: DataMap<QuantilePoint[]>;
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
  Data: DataMap<number>;
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
  Time?: RangeFilter;
  Tags?: JobTag[];
}

type RangeFilter = [number | undefined, number | undefined];
