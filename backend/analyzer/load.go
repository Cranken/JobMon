package analyzer

import (
	"bytes"
	"encoding/json"
	"fmt"
	"jobmon/job"
	"jobmon/logging"
)

type load struct {
	ExpectedLoad float64 `json:"expected_load"`
}

func NewLoadAnalyzer() *load {
	return new(load)
}

func (*load) name() string {
	return "load"
}

func (l *load) init(config json.RawMessage) error {
	logging.Info("analyzer: load: init()")

	if len(config) == 0 {
		return fmt.Errorf("load.init(): empty config")
	}

	decoder := json.NewDecoder(bytes.NewReader(config))
	decoder.DisallowUnknownFields()
	err := decoder.Decode(l)
	return err
}

func (*load) process(j job.JobMetadata) {

}
