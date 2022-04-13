package config

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"os"
)

const CONFIG_FILE = "config.json"

type Configuration struct {
	// Complete URL of InfluxDB, i.e. protocol, address and port
	DBHost string
	// InfluxDB access token to bucket
	DBToken string
	// Org the InfluxDB bucket belongs to
	DBOrg string
	// InfluxDB bucket
	DBBucket string

	// Configuration for the job store
	JobStore JobStoreConfig

	// Default time to live of jobs
	DefaultTTL int
	// Per partition metric config
	Metrics []MetricConfig
	// Job data LRU cache size
	CacheSize int
	// Prefetch job data into LRU cache upon job completion
	Prefetch bool
	// Sample interval of the metrics as configured in the metric collector
	SampleInterval string
	// Quantiles the frontend will display; Will be moved to frontend config
	MetricQuantiles []string
	// Secret to use when generating the JWT
	JWTSecret string
	// Authentication for local users; Key is username and value is the config
	LocalUsers map[string]LocalUser
	// Per partition configurations
	Partitions map[string]PartitionConfig
	// Metrics to display in the radar chart; Will be moved to frontend config
	RadarChartMetrics []string
}

type MetricConfig struct {
	// Metric type, e.g. "cpu", "node", "socket", "accelerator"
	Type string
	// Measurement name in Influxdb
	Measurement string
	// Aggregation function to use in aggregation of per device(cpu, socket, accelerator) data to node data
	AggFn string
	// Sample interval of the metric
	SampleInterval string
	// Unit; supported units are: "FLOP/s", "Bit/s", "°C", "B/s", "B", "%", ""
	Unit string
	// Display name for the metric
	DisplayName string
	// Custom filter function
	FilterFunc string
	// Influxdb Flux query string executed after the query but before the parsing.
	PostQueryOp string
	// Custom separation key to use in parsing
	SeparationKey string
	// Max value per node
	MaxPerNode int
	// max value per type
	MaxPerType int
	// Which aggregation function to use when aggregating pthreads and their corresponding hyperthread
	PThreadAggFn string
}

type PartitionConfig struct {
	// Maximum wall clock time for a job in the partition
	MaxTime int
	// Metrics the partition provides.
	// Array of measurement names as specified in the global metric config
	Metrics []string
}

type LocalUser struct {
	Password string
	// Role can be "job-control", "user", "admin"
	Role string
}

type JobStoreConfig struct {
	// Supported types: "memory", "postgres"; Defaults to "memory"
	Type string

	// Memory store config
	// Path to the file the job metadata store should use
	MemFilePath string

	// Postgres store config:
	// Postgres host address
	PSQLHost string
	// Postgres username
	PSQLUsername string
	// Postgres password
	PSQLPassword string
	// Postgres db for job metadata store
	PSQLDB string
}

func (c *Configuration) Init() {
	data, err := os.ReadFile(CONFIG_FILE)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("Could not read config file: %v\n Error: %v\n", CONFIG_FILE, err)
	}
	json.Unmarshal(data, c)
}
