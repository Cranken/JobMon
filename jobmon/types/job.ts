export interface JobMetadata {
  Id: number;
  UserId: string;
  ClusterId: string;
  NumNodes: number;
  NodeList: string;
  StartTime: number;
  StopTime: number;
  IsRunning: boolean;
  JobScript: string;
  ProjectId: string;
  Data: JobMetadataData[];
}

export interface JobListData {
  Jobs: JobMetadata[];
  Config: JobListConfig;
}

export interface JobListConfig {
  Metrics: MetricConfig[];
  Partitions: string[];
}

export enum CollectionType {
  PerNode,
  PerSocket,
  PerThread,
}

export interface MetricConfig {
  Type: string;
  Measurement: string;
  AggFn: string;
  SampleInterval: string;
  Unit: string;
  DisplayName: string;
  SeparationKey: string;
  MaxPerNode: string;
  MaxPerType: string;
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
  [key: string]: T[];
}

export interface MetricData {
  Config: MetricConfig;
  Data: DataMap<MetricPoint>;
}

export interface QuantileData {
  Config: MetricConfig;
  Quantiles: string[];
  Data: DataMap<QuantilePoint>;
}

export interface JobData {
  Metadata: JobMetadata;
  MetricData: MetricData[];
  QuantileData: QuantileData[];
}

export interface JobMetadataData {
  Config: MetricConfig;
  Data: number[];
}
