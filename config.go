package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"os"
)

const CONFIG_FILE = "config.json"

type Configuration struct {
	DBHost          string
	DBToken         string
	DBOrg           string
	DBBucket        string
	DefaultTTL      int
	Metrics         []MetricConfig
	CacheSize       int
	Prefetch        bool
	SampleInterval  string
	MetricQuantiles []string
	JobListMetrics  []string
	JWTSecret       string
	StoreFile       string
	LocalUsers      map[string]LocalUser
	Partitions      []string
}

type MetricConfig struct {
	Type           string
	Measurement    string
	AggFn          string
	SampleInterval string
	Unit           string
	DisplayName    string
	PostQueryOp    string
	SeparationKey  string
	MaxPerNode     string
	MaxPerType     string
	PThreadAggFn   string
}

type LocalUser struct {
	Password string
	Role     string
}

func (c *Configuration) Init() {
	data, err := os.ReadFile(CONFIG_FILE)
	if err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatalf("Could not read config file: %v\n Error: %v\n", CONFIG_FILE, err)
	}
	json.Unmarshal(data, c)
}
