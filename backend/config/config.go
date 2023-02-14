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

// Configuration stores the main configuration data required during the application launch.
type Configuration struct {
	DBHost string // Complete URL of InfluxDB, i.e. protocol, address and port

	DBToken string // InfluxDB access token to bucket

	DBOrg string // Org the InfluxDB bucket belongs to

	DBBucket string // InfluxDB bucket

	FrontendURL string // Frontend URL

	JobStore JobStoreConfig // Configuration for the job store

	OAuth OAuthConfig // Configuration for OAuth Login

	Metrics []MetricConfig // Per partition metric config

	CacheSize int // Job data LRU cache size

	Prefetch bool // Prefetch job data into LRU cache upon job completion

	SampleInterval string // Sample interval of the metrics as configured in the
	// metric collector String formatted as e.g. 30s or 1m

	MetricQuantiles []string // Quantiles the frontend will display; Will be moved
	// to frontend config Values are percentages formatted as decimal (0.X)

	JWTSecret string // Secret to use when generating the JWT

	LocalUsers map[string]LocalUser // Authentication for local users;
	// Key is username and value is the config

	Partitions map[string]PartitionConfig // Per partition configurations

	MetricCategories []string // Categories used for grouping metrics

	RadarChartMetrics []string // Metrics to display in the radar chart;
	// Will be moved to frontend config
}

// MetricConfig represents a metric configuration configured by the admin.
type MetricConfig struct {
	GUID string // Global unique identifier for metric

	Type string // Metric type, e.g. "cpu", "node", "socket", "accelerator"

	Categories []string // Category the metric belongs to. Must be one of config->MetricCategories

	Measurement string // Measurement name in Influxdb

	AggFn string // Default Aggregation function to use in aggregation of per
	// device(cpu, socket, accelerator) data to node data.Not used for metrics with type == "node"

	AvailableAggFns []string // List of all possible aggregation functions

	SampleInterval string // Sample interval of the metric

	Unit string // Unit; supported units are: "FLOP/s", "Bit/s", "°C", "B/s", "B", "%", ""

	DisplayName string // Display name for the metric

	FilterFunc string // Custom filter function

	PostQueryOp string // Influxdb Flux query string executed after the query but before the parsing.

	SeparationKey string // Custom separation key to use in parsing

	MaxPerNode int // Max value per node

	MaxPerType int // max value per type

	PThreadAggFn string // Which aggregation function to use when aggregating pthreads
	// and their corresponding hyperthread
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

// TODO: Add docs
type PartitionConfig struct {
	BasePartitionConfig                                   // Base partition configuration
	VirtualPartitions   map[string]VirtualPartitionConfig // Virtual partitions inside this parent partition
}

// LocalUser stores the access credentials for local users.
type LocalUser struct {
	Password string // Password of LocalUser
	Role     string // Role can be "job-control", "user", "admin"
}

// JobStoreConfig represents a configuration for the job store
type JobStoreConfig struct {
	Type string // Database type. Supported types: "postgres".

	PSQLHost string // Postgres store config: Postgres host address.

	PSQLUsername string // Postgres username

	PSQLPassword string // Postgres password

	PSQLDB string // Postgres db for job metadata store
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

// Flush saves the state of the configuration c into the config.json file.
func (c *Configuration) Flush() {
	data, err := json.MarshalIndent(c, "", "    ")
	if err != nil {
		log.Printf("Could not marshal config into json: %v\n", err)
	}
	os.WriteFile(CONFIG_FILE, data, 0644)
}
