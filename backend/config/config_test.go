package config

import (
	"reflect"
	"testing"
	"time"
)

func InitTesting() {
	testingMode = true
}

func TestInit(t *testing.T) {
	// Create a test configuration
	InitTesting()

	var c Configuration

	c.ConfigFile = "./test_config.json"

	// Call the Init function
	c.Init()

	// Test the values after initialization
	if c.ConfigFile != "./test_config.json" {
		t.Error("ConfigFile value is incorrect")
	}

	if c.JSONWebTokenLifeTimeString != "24h" {
		t.Error("JSONWebTokenLifeTimeString value is incorrect")
	}
	if c.JSONWebTokenLifeTime != 24*time.Hour {
		t.Error("JSONWebTokenLifeTime value is incorrect")
	}
	if c.APITokenLifeTimeString != "87600h" {
		t.Error("APITokenLifeTimeString value is incorrect")
	}
	if c.APITokenLifeTime != 87600*time.Hour {
		t.Error("APITokenLifeTime value is incorrect")
	}
	if c.AutoAssignUserRole != true {
		t.Error("AutoAssignUserRole value is incorrect")
	}
	if c.FrontendURL != "http://my-jobmon-frontend.example.com:3000" {
		t.Error("FrontendURL value is incorrect")
	}

	if c.CacheSize != 50 {
		t.Error("CacheSize value is incorrect")
	}
	if c.Prefetch != true {
		t.Error("Prefetch value is incorrect")
	}
	if c.SampleInterval != "30s" {
		t.Error("SampleInterval value is incorrect")
	}
	if len(c.MetricQuantiles) != 3 || c.MetricQuantiles[0] != "0.25" || c.MetricQuantiles[1] != "0.5" || c.MetricQuantiles[2] != "0.75" {
		t.Error("MetricQuantiles value is incorrect")
	}

	if c.JWTSecret != "my-jwtsecret" {
		t.Error("JWTSecret value is incorrect")
	}
	c.Flush()
}

func TestFlush(t *testing.T) {

	InitTesting()
	// Create a test configuration
	var conf Configuration

	conf.ConfigFile = "./test_config.json"

	// Call the Init function
	conf.Init()

	if conf.JWTSecret != "my-jwtsecret" {
		t.Error("JWTSecret value is incorrect")
	}
	// Save the current JWTSecret
	currentJWTSecret := conf.JWTSecret

	conf.JWTSecret = "dummy-secret"

	conf.Flush()

	conf.Init()

	// Check if the JWTSecrete value was updated.
	if conf.JWTSecret != "dummy-secret" {
		t.Error("JWTSecret value is incorrect")
	}
	// Restore the old value of JWTSecret.
	conf.JWTSecret = currentJWTSecret

	conf.Flush()

}
func TestGetDeletedMetrics(t *testing.T) {
	var expectedDeletedMetrics []string
	var deletedMetrics []string

	// First case: at least one common element.
	oldConf1 := Configuration{
		Metrics: []MetricConfig{
			{GUID: "metric1"},
			{GUID: "metric2"},
			{GUID: "metric3"},
		},
	}

	newConf1 := Configuration{
		Metrics: []MetricConfig{
			{GUID: "metric2"},
			{GUID: "metric4"},
			{GUID: "metric5"},
		},
	}

	expectedDeletedMetrics = []string{"metric1", "metric3"}

	deletedMetrics = newConf1.GetDeletedMetrics(oldConf1)

	if !reflect.DeepEqual(deletedMetrics, expectedDeletedMetrics) {
		t.Errorf("GetDeletedMetrics failed. Expected: %v, Got: %v", expectedDeletedMetrics, deletedMetrics)
	}

	// Case 2: No common elements
	oldConf2 := Configuration{
		Metrics: []MetricConfig{
			{GUID: "metric1"},
			{GUID: "metric2"},
			{GUID: "metric3"},
		},
	}

	newConf2 := Configuration{
		Metrics: []MetricConfig{
			{GUID: "metric4"},
			{GUID: "metric5"},
			{GUID: "metric6"},
		},
	}
	expectedDeletedMetrics = []string{"metric1", "metric2", "metric3"}

	deletedMetrics = newConf2.GetDeletedMetrics(oldConf2)

	if !reflect.DeepEqual(deletedMetrics, expectedDeletedMetrics) {
		t.Errorf("GetDeletedMetrics failed. Expected: %v, Got: %v", expectedDeletedMetrics, deletedMetrics)
	}

	// Case 3: old configuration is a subset of the new configuration.
	oldConf3 := Configuration{
		Metrics: []MetricConfig{
			{GUID: "metric1"},
			{GUID: "metric2"},
		},
	}
	newConf3 := Configuration{
		Metrics: []MetricConfig{
			{GUID: "metric1"},
			{GUID: "metric2"},
			{GUID: "metric3"},
			{GUID: "metric4"},
			{GUID: "metric5"},
		},
	}

	expectedDeletedMetrics = []string{}

	deletedMetrics = newConf3.GetDeletedMetrics(oldConf3)

	if !reflect.DeepEqual(deletedMetrics, expectedDeletedMetrics) {
		t.Errorf("GetDeletedMetrics failed. Expected: %v, Got: %v", expectedDeletedMetrics, deletedMetrics)
	}
}

func TestRemoveMissingMetrics(t *testing.T) {
	var pc PartitionConfig
	var removedMetrics []string
	var expectedMetrics []string
	// Create a sample PartitionConfig with metrics

	pc = PartitionConfig{
		BasePartitionConfig: BasePartitionConfig{
			Metrics: []string{"metric1", "metric2", "metric3"},
		},
		VirtualPartitions: map[string]VirtualPartitionConfig{},
	}

	// Define the metrics that should be removed
	removedMetrics = []string{"metric4", "metric5"}

	// Call the RemoveMissingMetrics function
	pc.RemoveMissingMetrics(removedMetrics)

	// Define the expected result
	expectedMetrics = []string{"metric1", "metric2", "metric3"}

	// Check if the metrics have been removed correctly
	if !reflect.DeepEqual(pc.Metrics, expectedMetrics) {
		t.Errorf("RemoveMissingMetrics failed, expected: %v, got: %v", expectedMetrics, pc.Metrics)
	}

	pc = PartitionConfig{
		BasePartitionConfig: BasePartitionConfig{
			Metrics: []string{"metric1", "metric2", "metric3"},
		},
		VirtualPartitions: map[string]VirtualPartitionConfig{},
	}

	// Define the metrics that should be removed
	removedMetrics = []string{"metric1", "metric3"}

	// Call the RemoveMissingMetrics function
	pc.RemoveMissingMetrics(removedMetrics)

	// Define the expected result
	expectedMetrics = []string{"metric2"}

	if !reflect.DeepEqual(pc.Metrics, expectedMetrics) {
		t.Errorf("RemoveMissingMetrics failed, expected: %v, got: %v", expectedMetrics, pc.Metrics)
	}

	pc = PartitionConfig{
		BasePartitionConfig: BasePartitionConfig{
			Metrics: []string{"metric1", "metric2"},
		},
		VirtualPartitions: map[string]VirtualPartitionConfig{},
	}

	// Define the metrics that should be removed
	removedMetrics = []string{}

	// Call the RemoveMissingMetrics function
	pc.RemoveMissingMetrics(removedMetrics)

	// Define the expected result
	expectedMetrics = []string{"metric1", "metric2"}

	if !reflect.DeepEqual(pc.Metrics, expectedMetrics) {
		t.Errorf("RemoveMissingMetrics failed, expected: %v, got: %v", expectedMetrics, pc.Metrics)
	}
}
