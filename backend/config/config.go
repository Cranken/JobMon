package config

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"jobmon/logging"
	"jobmon/utils"
	"os"
	"sort"

	"github.com/google/uuid"
)

var configFile string

// Configuration stores the main configuration data required during the application launch.
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
	Metrics []MetricConfig `json:"Metrics"`
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

// MetricConfig represents a metric configuration configured by the admin.
type MetricConfig struct {
	// Global unique identifier for metric
	GUID string `json:"GUID"`
	// Metric type, e.g. "cpu", "node", "socket", "accelerator"
	Type string `json:"Type"`
	// Category the metric belongs to. Must be one of config->MetricCategories
	Categories []string `json:"Categories"`
	// Measurement name in Influxdb
	Measurement string `json:"Measurement"`
	// Default Aggregation function to use in aggregation of per device
	// (cpu, socket, accelerator) data to node data.
	// Not used for metrics with type == "node"
	AggFn string `json:"AggFn"`
	// List of all possible aggregation functions
	AvailableAggFns []string `json:"AvailableAggFns"`
	// Sample interval of the metric
	SampleInterval string `json:"SampleInterval"`
	// Unit; supported units are: "FLOP/s", "Bit/s", "°C", "B/s", "B", "%", ""
	Unit string `json:"Unit"`
	// Display name for the metric
	DisplayName string `json:"DisplayName"`
	// Custom filter function
	FilterFunc string `json:"FilterFunc"`
	// Influxdb Flux query string executed after the query but before the parsing.
	PostQueryOp string `json:"PostQueryOp"`
	// Custom separation key to use in parsing
	SeparationKey string `json:"SeparationKey"`
	// Max value per node
	MaxPerNode int `json:"MaxPerNode"`
	// max value per type
	MaxPerType int `json:"MaxPerType"`
	// Which aggregation function to use when aggregating pthreads and their corresponding hyperthread
	PThreadAggFn string `json:"PThreadAggFn"`
}

// A BasePartitionConfig represents a partition configuration
type BasePartitionConfig struct {
	MaxTime int      // Maximum wall clock time for a job in the partition
	Metrics []string // Metrics the partition provides. Array of measurement names as specified in the global metric config.
}

// VirtualPartitionConfig defines a virtual partition, for a subset of Nodes.
type VirtualPartitionConfig struct {
	BasePartitionConfig          // Base partition config
	Nodes               []string // Node ranges inside the parent partition which this virtual partition applies to.
}

// PartitionConfig represents a partition that contains both physical and virtual partitions.
type PartitionConfig struct {
	BasePartitionConfig                                   // Base partition configuration
	VirtualPartitions   map[string]VirtualPartitionConfig // Virtual partitions inside this parent partition
}

// LocalUser stores the access credentials for local users.
type LocalUser struct {
	Password string // Password of LocalUser
	Role     string // Role can be "job-control", "user", "admin"
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

// OAuthConfig represents a configuration for the OAuth login.
type OAuthConfig struct {
	ClientID string // OAuth Client ID

	Secret string // OAuth Secret

	AuthURL string // OAuth Endpoint Auth URL

	TokenURL string // OAuth Endpoint Token URL

	RedirectURL string // OAuth Redirect URL, i.e. backend oauth
	// callback endpoint ("<backend_host>/auth/oauth/callback")

	UserInfoURL string // Oauth User Info URL

	AfterLoginRedirectUrl string // URL to which the user will be redirected
	// to after successful login. Set to some frontend url, e.g. "<frontend_host>/jobs"
}

// Init reads the config.json file and maps the data form the json file to the
// configuration struct c.
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

	// Check for each partition and radar chart that all used metric GUIDs are configured
	metricAvailable := make(map[string]bool)
	for _, m := range c.Metrics {
		metricAvailable[m.GUID] = true
	}
	for partName, partConfig := range c.Partitions {
		for _, partMetrics := range partConfig.Metrics {
			if !metricAvailable[partMetrics] {
				logging.Fatal("config: Init(): Metric ", partMetrics, " from partition ", partName, " config is not available")
			}
		}
	}
	for _, radarChartMetrics := range c.RadarChartMetrics {
		if !metricAvailable[radarChartMetrics] {
			logging.Fatal("config: Init(): Metric ", radarChartMetrics, " from radar chart config is not available")
		}
	}

	// Check that only allowed aggregation functions are used
	aggFnAvailable := map[string]bool{
		"max":  true,
		"mean": true,
		"min":  true,
		"sum":  true,
	}
	for _, metricConfig := range c.Metrics {
		if !aggFnAvailable[metricConfig.AggFn] {
			logging.Fatal("config: Init(): Metric ", metricConfig.GUID, " uses unknown AggFn = ", metricConfig.AggFn)
		}
		for _, aggFn := range metricConfig.AvailableAggFns {
			if !aggFnAvailable[aggFn] {
				logging.Fatal("config: Init(): Metric ", metricConfig.GUID, " uses unknown AvailableAggFns = ", metricConfig.AggFn)
			}
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

// Flush saves the state of the configuration c into the config.json file.
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

// Metrics parameter contains all metrics GUID that should be deleted
func (pc *PartitionConfig) RemoveMissingMetrics(metrics []string) {
	for _, v := range metrics {
		pc.Metrics = utils.Remove(pc.Metrics, v)
	}
}

// Returns all metrics that have been deleted from the oldConf to the newConf
func (newConf *Configuration) GetDeletedMetrics(oldConf Configuration) []string {
	availableGuids := make([]string, 0)
	for _, mc := range newConf.Metrics {
		availableGuids = append(availableGuids, mc.GUID)
	}
	deletedGuids := make([]string, 0)
	for _, mc := range oldConf.Metrics {
		if !utils.Contains(availableGuids, mc.GUID) {
			deletedGuids = append(deletedGuids, mc.GUID)
		}
	}
	return deletedGuids
}
