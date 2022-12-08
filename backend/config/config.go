package config

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"os"
	"sort"

	"github.com/google/uuid"
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

	// Frontend URL
	FrontendURL string

	// Configuration for the job store
	JobStore JobStoreConfig

	// Configuration for OAuth Login
	OAuth OAuthConfig

	// Per partition metric config
	Metrics []MetricConfig
	// Job data LRU cache size
	CacheSize int
	// Prefetch job data into LRU cache upon job completion
	Prefetch bool
	// Sample interval of the metrics as configured in the metric collector
	// String formatted as e.g. 30s or 1m
	SampleInterval string
	// Quantiles the frontend will display; Will be moved to frontend config
	// Values are percentages formatted as decimal (0.X)
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
	// Global unique identifier for metric
	GUID string
	// Metric type, e.g. "cpu", "node", "socket", "accelerator"
	Type string
	// Measurement name in Influxdb
	Measurement string
	// Default Aggregation function to use in aggregation of per device(cpu, socket, accelerator) data to node data.
	// Not used for metrics with type == "node"
	AggFn string
	// List of all possible aggregation functions
	AvailableAggFns []string
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

type BasePartitionConfig struct {
	// Maximum wall clock time for a job in the partition
	MaxTime int
	// Metrics the partition provides.
	// Array of measurement names as specified in the global metric config
	Metrics []string
}

type VirtualPartitionConfig struct {
	BasePartitionConfig
	// Node ranges inside the parent partition which this virtual partition applies to
	Nodes []string
}

type PartitionConfig struct {
	BasePartitionConfig
	// Virtual partitions inside this parent partition
	VirtualPartitions map[string]VirtualPartitionConfig
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
	// Default time to live of jobs
	MemDefaultTTL int

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

type OAuthConfig struct {
	// OAuth Client ID
	ClientID string
	// OAuth Secret
	Secret string
	// OAuth Endpoint Auth URL
	AuthURL string
	// OAuth Endpoint Token URL
	TokenURL string
	// OAuth Redirect URL, i.e. backend oauth callback endpoint ("<backend_host>/auth/oauth/callback")
	RedirectURL string
	// Oauth User Info URL
	UserInfoURL string
	// URL to which the user will be redirected to after successful login.
	// Set to some frontend url, e.g. "<frontend_host>/jobs"
	AfterLoginRedirectUrl string
}

func (c *Configuration) Init() {
	data, err := os.ReadFile(CONFIG_FILE)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("config: Could not read config file: %v\n Error: %v\n", CONFIG_FILE, err)
	}
	err = json.Unmarshal(data, c)
	if err != nil {
		log.Fatalf("config: Could not unmarshal config file %v", err)
	}
	for i, mc := range c.Metrics {
		if mc.GUID == "" {
			mc.GUID = uuid.New().String()
			c.Metrics[i] = mc
		}
	}
	sort.SliceStable(c.Metrics, func(i, j int) bool { return c.Metrics[i].DisplayName < c.Metrics[j].DisplayName })
}

func (c *Configuration) Flush() {
	data, err := json.MarshalIndent(c, "", "    ")
	if err != nil {
		log.Printf("Could not marshal config into json: %v\n", err)
	}
	os.WriteFile(CONFIG_FILE, data, 0644)
}
