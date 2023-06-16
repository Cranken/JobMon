package analyzer

import (
	"encoding/json"
	"jobmon/config"
	"jobmon/job"
	"jobmon/logging"
	"sync"
)

// Interface for analyzer
type analyzers interface {
	name() string               // name of the analyzer
	init(json.RawMessage) error // initialize analyzer
	process(job.JobMetadata)    // process a job
}

// Analyzer manager
type manager struct {
	wg            sync.WaitGroup
	input         chan job.JobMetadata // input channel with jobs
	done          chan bool            // channel to finish / stop analyzer manager
	analyzersList []analyzers
}

// Slice of all available analyzers
var availableAnalyzers = []analyzers{
	NewLoadAnalyzer(),
}

// NewManager creates a new analyzer manager
func NewManager() *manager {
	logging.Info("analyzer: NewManager()")

	m := manager{
		done:          make(chan bool),
		input:         make(chan job.JobMetadata, 100),
		analyzersList: make([]analyzers, 0),
	}

	return &m
}

func (m *manager) Init(config config.Configuration) {
	logging.Info("analyzer: manager: Init()")

	// Split config in per analyzer configs
	var analyzerRawConfigs map[string]json.RawMessage
	json.Unmarshal(config.Analyzer, &analyzerRawConfigs)

	// Try to add all available analyzers
	for _, analyzer := range availableAnalyzers {
		name := analyzer.name()

		// initialize analyzer
		err := analyzer.init(analyzerRawConfigs[name])
		if err != nil {
			logging.Error("Failed analyzer.init(): name = ", name, " err = ", err)
			// Skip analyzers with failed initialization
			continue
		}

		// add analyzer
		m.AddAnalyzer(analyzer)
	}
}

// Start starts the analyzer manager in the background
func (m *manager) Start() {
	logging.Info("analyzer: manager: Start()")
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		for {
			select {
			case <-m.done:
				return
			case job := <-m.input:
				// Process job with all available analyzers
				for _, a := range m.analyzersList {
					a.process(job)
				}
			}
		}
	}()
}

// Stop stops the analyzer manager
func (m *manager) Stop() {
	logging.Info("analyzer: manager: Stop()")
	m.done <- true
	m.wg.Wait()
}

// AddJob adds a task to the analyzer manager
func (m *manager) AddJob(j job.JobMetadata) {
	m.input <- j
}

// AddAnalyzer adds a analyzer to the analyzer manager
func (m *manager) AddAnalyzer(a analyzers) {
	m.analyzersList = append(m.analyzersList, a)
}
