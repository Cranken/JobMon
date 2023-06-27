package config

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"jobmon/logging"
	"jobmon/utils"
	"os"
	"sort"
	"time"

	"github.com/google/uuid"
)

// Configuration stores the main configuration data required during the application launch.
type Configuration struct {

	// Config from the command line interface
	CLIConfig `json:"-"`

	JSONWebTokenLifeTimeString         string        `json:"json_web_token_life_time"`
	JSONWebTokenLifeTime               time.Duration `json:"-"`
	JSONWebTokenExtendedLifeTimeString string        `json:"json_web_token_extended_life_time"`
	JSONWebTokenExtendedLifeTime       time.Duration `json:"-"`
	APITokenLifeTimeString             string        `json:"api_token_life_time"`
	APITokenLifeTime                   time.Duration `json:"-"`

	// Do you want to automatically assign user role to users without assigned roles?
	AutoAssignUserRole bool `json:"auto_assign_user_role"`

	// Configuration for performance metrics database
	// current implementation uses InfluxDB only
	DBConfig

	// Configuration for jobmon frontend
	// Frontend URL e.g. http://my-jobmon-frontend.example.com:3000
	FrontendURL string `json:"FrontendURL"`

	// Configuration for job meta data database
	// current implementations uses PostgreSQL only
	JobStore JobStoreConfig `json:"JobStore"`

	// Configuration for OAuth Login
	OAuth OAuthConfig `json:"OAuth"`

	// Per partition metric config
	Metrics []MetricConfig `json:"Metrics"`
	// Job data LRU cache size
	CacheSize int `json:"CacheSize"`
	// Prefetch job data into LRU cache upon job completion
	Prefetch bool `json:"Prefetch"`
	// Sample interval of the metrics as configured in the metric collector
	// String formatted as e.g. 30s or 1m
	SampleInterval string `json:"SampleInterval"`
	// Quantiles the frontend will display; Will be moved to frontend config
	// Values are percentages formatted as decimal (0.X)
	MetricQuantiles []string `json:"MetricQuantiles"`
	// Secret to use when generating the JWT
	JWTSecret string `json:"JWTSecret"`
	// Authentication for local users; Key is username and value is the config
	LocalUsers map[string]LocalUser `json:"LocalUsers"`
	// Per partition configurations
	Partitions map[string]PartitionConfig `json:"Partitions"`
	// Categories used for grouping metrics
	MetricCategories []string `json:"MetricCategories"`
	// Metrics to display in the radar chart; Will be moved to frontend config
	RadarChartMetrics []string `json:"RadarChartMetrics"`
	// Configuration for email notifications
	Email EmailConfig `json:"EmailNotification"`
}

// Config from the command line interface
type CLIConfig struct {
	ConfigFile    string // config file
	LogLevel      int    // log level
	ListenAddress string // TCP address for the server to listen on
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
	//A list of measurements from which the actual measurement is computed.
	SubMeasurements []string `json:"SubMeasurements"`
}

// A BasePartitionConfig represents a partition configuration
type BasePartitionConfig struct {
	// Maximum wall clock time for a job in the partition
	MaxTime int `json:"MaxTime"`
	// Metrics the partition provides. Array of measurement names as specified in the global metric config.
	Metrics []string `json:"Metrics"`
}

// VirtualPartitionConfig defines a virtual partition, for a subset of Nodes.
type VirtualPartitionConfig struct {
	// Base partition config
	BasePartitionConfig
	// Node ranges inside the parent partition which this virtual partition applies to.
	Nodes []string `json:"Nodes"`
}

// PartitionConfig represents a partition that contains both physical and virtual partitions.
type PartitionConfig struct {
	// Base partition configuration
	BasePartitionConfig
	// Virtual partitions inside this parent partition
	VirtualPartitions map[string]VirtualPartitionConfig `json:"VirtualPartitions"`
}

// LocalUser stores the access credentials for local users.
type LocalUser struct {
	// bcrypt hash of password of LocalUser
	BCryptHash string `json:"BCryptHash"`
	// Role can be "job-control", "user", "admin"
	Role string `json:"Role"`
}

// Configuration for performance metrics database
// current implementation uses InfluxDB only
type DBConfig struct {
	// Complete URL of InfluxDB, e.g. http://my-inxuxdb.example.org:9200
	DBHost string `json:"DBHost"`
	// InfluxDB access token to bucket
	DBToken string `json:"DBToken"`
	// Org the InfluxDB bucket belongs to
	DBOrg string `json:"DBOrg"`
	// InfluxDB bucket
	DBBucket string `json:"DBBucket"`
}

// Configuration for job meta data database
// current implementation uses PostgreSQL only
type JobStoreConfig struct {
	// Supported types: "postgres"
	Type string `json:"Type"`

	// PostgreSQL database config:
	// Postgres host address e.g. my-postgresql.example.org:5432
	PSQLHost string `json:"PSQLHost"`
	// Postgres username
	PSQLUsername string `json:"PSQLUsername"`
	// Postgres password
	PSQLPassword string `json:"PSQLPassword"`
	// Postgres db for job metadata store
	PSQLDB string `json:"PSQLDB"`
}

// OAuthConfig represents a configuration for the OAuth login.
type OAuthConfig struct {
	// OAuth Client ID
	ClientID string `json:"ClientID"`
	// OAuth Secret
	Secret string `json:"Secret"`
	// OAuth Endpoint Auth URL
	AuthURL string `json:"AuthURL"`
	// OAuth Endpoint Token URL
	TokenURL string `json:"TokenURL"`
	// OAuth Redirect URL, i.e. backend oauth
	// callback endpoint ("<backend_host>/auth/oauth/callback")
	RedirectURL string `json:"RedirectURL"`
	// Oauth User Info URL
	UserInfoURL string `json:"UserInfoURL"`
	// URL to which the user will be redirected
	// to after successful login. Set to some frontend url, e.g. "<frontend_host>/jobs"
	AfterLoginRedirectUrl string `json:"AfterLoginRedirectUrl"`
}

// EmailConfig contains configurations for email notifications
type EmailConfig struct {
	// Address to send notifications from
	SenderAddress string `json:"SenderAddress"`
	// Password to use the sender address
	SenderPassword string `json:"SenderPassword"`
	// Address to send notifications to
	ReceiverAddress string `json:"ReceiverAddress"`
	// Address of the smtp-server
	SmtpHost string `json:"SmtpHost"`
	// Port of the smtp-server
	SmtpPort int `json:"SmtpPort"`
}

var testingMode = false

// Init reads the config.json file and maps the data form the json file to the
// configuration struct c.
func (c *Configuration) Init() {

	// Read command line options
	var help bool

	// In testing mode, flags are setup multiple times, hence the following
	// lines would fail the unit tests.
	if !testingMode {
		flag.StringVar(&c.ConfigFile, "config", "config.json", "config file")
		flag.IntVar(&c.LogLevel, "log", logging.WarningLogLevel,
			fmt.Sprint("log level:",
				" off=", logging.OffLogLevel,
				" error=", logging.ErrorLogLevel,
				" warning=", logging.WarningLogLevel,
				" info=", logging.InfoLogLevel,
				" debug=", logging.DebugLogLevel))
		flag.StringVar(&c.ListenAddress, "listen-addr", ":8080", "TCP address for the server to listen on")
		flag.BoolVar(&help, "help", false, "print this help message")
		flag.Parse()
	}

	// print help message
	if help {
		flag.Usage()
		os.Exit(0)
	}

	// Set log level
	if err := logging.SetLogLevel(c.LogLevel); err != nil {
		logging.Fatal("config: Init(): Could not set log level: ", err)
	}

	// Read config file
	data, err := os.ReadFile(c.ConfigFile)
	if err != nil && errors.Is(err, fs.ErrNotExist) {
		logging.Fatal("config: Init(): Could not read config file: '", c.ConfigFile, "' Error: ", err)
	}
	logging.Info("config: Init(): Read config file '", c.ConfigFile, "'")

	// Default config values
	c.JSONWebTokenLifeTimeString = "24h"
	c.JSONWebTokenExtendedLifeTimeString = "48h"
	c.APITokenLifeTimeString = fmt.Sprint(10*365*24, "h") // API token should "never" expire
	c.AutoAssignUserRole = false

	// Decode JSON
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if err := d.Decode(c); err != nil {
		logging.Fatal("config: Init(): Could not decode config file: ", err)
	}
	logging.Info("config: Init(): Parsed config file '", c.ConfigFile, "'")

	// Compute JSON web token and API token life time
	c.JSONWebTokenLifeTime, err = time.ParseDuration(c.JSONWebTokenLifeTimeString)
	if err != nil {
		logging.Fatal("config: Init(): Failed to parse json_web_token_life_time `", c.JSONWebTokenLifeTimeString, "`: ", err)
	}
	c.JSONWebTokenExtendedLifeTime, err = time.ParseDuration(c.JSONWebTokenExtendedLifeTimeString)
	if err != nil {
		logging.Fatal("config: Init(): Failed to parse json_web_token_extended_life_time `", c.JSONWebTokenExtendedLifeTimeString, "`: ", err)
	}
	c.APITokenLifeTime, err = time.ParseDuration(c.APITokenLifeTimeString)
	if err != nil {
		logging.Fatal("config: Init(): Failed to parse api_token_life_time `", c.APITokenLifeTimeString, "`: ", err)
	}

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

	//TODO: Write a check for the SubMeasurements, one needs to check if the subMeasurements belong to the list of measurements.

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
	err = os.WriteFile(c.ConfigFile, data, 0644)
	if err != nil {
		logging.Error("config: Flush(): Writing file '", c.ConfigFile, "' failed: ", err)
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
