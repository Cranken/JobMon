import { MetricConfig, PartitionConfig } from "./job";

/**
 * Configuration represents a configuration structure used for storing 
 * configured metrics, partitions and metric categories.
 */
export interface Configuration {
  Metrics: MetricConfig[];
  MetricCategories: string[];
  Partitions: { [key: string]: PartitionConfig; };
}

/**
 * UserRoles represents a type for storing a users username and roles.
 */
export interface UserRoles {
  Username: string;
  Roles: string[];
}