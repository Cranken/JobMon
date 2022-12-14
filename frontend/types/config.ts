import { MetricConfig, PartitionConfig } from "./job";

export interface Configuration {
  Metrics: MetricConfig[];
  Partitions: { [key: string]: PartitionConfig; };
}

export interface UserRoles {
  Username: string;
  Roles: string[];
}

export enum AvailableUserRoles {
  User = "user",
  Admin = "admin",
  JobControl = "job-control"
}