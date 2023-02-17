package config

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"jobmon/logging"
	"os"
	"sort"

	"github.com/google/uuid"
)

var configFile string

type Configuration struct {

	// Configuration for performance metrics database
	// current implementation uses InfluxDB only
	DBConfig

	// Configuration for jobmon frontend
	// Frontend URL e.g. http://my-jobmon-frontend.example.com:3000
	FrontendURL string

	// Configuration for job meta data database
	// current implementations uses PostgreSQL only
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
	// Categories used for grouping metrics
	MetricCategories []string
	// Metrics to display in the radar chart; Will be moved to frontend config
	RadarChartMetrics []string
}

type MetricConfig struct {
	// Global unique identifier for metric
	GUID string
	// Metric type, e.g. "cpu", "node", "socket", "accelerator"
	Type string
	// Category the metric belongs to. Must be one of config->MetricCategories
	Categories []string
	// Measurement name in Influxdb
	Measurement string
	// Default Aggregation function to use in aggregation of per device
	// (cpu, socket, accelerator) data to node data.
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

// Configuration for performance metrics database
// current implementation uses InfluxDB only
type DBConfig struct {
	// Complete URL of InfluxDB, e.g. http://my-inxuxdb.example.org:9200
	DBHost string
	// InfluxDB access token to bucket
	DBToken string
	// Org the InfluxDB bucket belongs to
	DBOrg string
	// InfluxDB bucket
	DBBucket string
}

// Configuration for job meta data database
// current implementation uses PostgreSQL only
type JobStoreConfig struct {
	// Supported types: "postgres"
	Type string

	// PostgreSQL database config:
	// Postgres host address e.g. my-postgresql.example.org:5432
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

	// Read command line options
	var logLevel int
	var help bool
	flag.StringVar(&configFile, "config", "config.json", "config file")
	flag.IntVar(&logLevel, "debug", logging.WarningLogLevel,
		fmt.Sprint("debug level:",
			" off=", logging.OffLogLevel,
			" error=", logging.ErrorLogLevel,
			" warning=", logging.WarningLogLevel,
			" info=", logging.InfoLogLevel,
			" debug=", logging.DebugLogLevel))
	flag.BoolVar(&help, "help", false, "print this help message")
	flag.Parse()

	// print help message
	if help {
		flag.Usage()
		os.Exit(0)
	}

	// Set log level
	if err := logging.SetLogLevel(logLevel); err != nil {
		logging.Fatal("config: Init(): Could not set log level: ", err)
	}

	// Read config file
	data, err := os.ReadFile(configFile)
	if err != nil && errors.Is(err, fs.ErrNotExist) {
		logging.Fatal("config: Init(): Could not read config file: '", configFile, "' Error: ", err)
	}
	logging.Info("config: Init(): Read config file '", configFile, "'")

	err = json.Unmarshal(data, c)
	if err != nil {
		logging.Fatal("config: Init(): Could not unmarshal config file: ", err)
	}
	logging.Info("config: Init(): Parsed config file '", configFile, "'")

	// Add GUIDs to metrics if any are missing
	for i := range c.Metrics {
		mc := &c.Metrics[i]
		if mc.GUID == "" {
			mc.GUID = uuid.New().String()
		}
	}

	// Sort metrics by DisplayName
	sort.SliceStable(
		c.Metrics,
		func(i, j int) bool {
			return c.Metrics[i].DisplayName < c.Metrics[j].DisplayName
		})

	logging.Debug("config: Init(): Configuration: ", fmt.Sprintf("%+v", *c))
}

// Flush writes current configuration to the config file
func (c *Configuration) Flush() {

	// marshal current configuration to json
	data, err := json.MarshalIndent(c, "", "    ")
	if err != nil {
		logging.Error("config: Flush(): Could not marshal config into json: ", err)
	}

	// Write json to config file
	err = os.WriteFile(configFile, data, 0644)
	if err != nil {
		logging.Error("config: Flush(): Writing file '", configFile, "' failed: ", err)
	}
}
