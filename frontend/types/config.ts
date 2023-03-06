import { MetricConfig, PartitionConfig } from "./job";

/**
 * Configuration represents a container for metrics, metric-categories and partitions.
 */
export interface Configuration {
  Metrics: MetricConfig[];
  MetricCategories: string[];
  Partitions: { [key: string]: PartitionConfig; };
}

/**
 * UserRoles connects a username with roles. Roles are represented by their name.
 */
export interface UserRoles {
  Username: string;
  Roles: string[];
}