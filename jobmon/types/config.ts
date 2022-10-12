import { MetricConfig, PartitionConfig } from "./job";

export interface Configuration {
  Metrics: MetricConfig[];
  Partitions: { [key: string]: PartitionConfig };
}
