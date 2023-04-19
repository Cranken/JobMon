package analysis

import (
	"sync"
	"time"

	"jobmon/job"

	"pgregory.net/changepoint"
)

// TODO:Add docs
func ChangePointDetection(j *job.JobData) map[string][]time.Time {
	var wg sync.WaitGroup
	var lock sync.Mutex
	data := make(map[string][]time.Time)
	for _, m := range j.MetricData {
		wg.Add(1)
		go func(m job.MetricData) {
			defer wg.Done()
			for _, v := range m.Data {

				// Store measurements in float64 slice
				values := make([]float64, 0)
				for _, vi := range v {
					val := vi["_value"]
					if val == nil {
						return
					}
					values = append(values, val.(float64))
				}

				// Compute indexes of elements that split measurements into
				// "statistically homogeneous" segments.
				cpts := changepoint.NonParametric(values, 1)

				times := make([]time.Time, 0)
				for _, i := range cpts {
					times = append(times, v[i]["_time"].(time.Time))
				}
				lock.Lock()
				data[m.Config.Measurement] = times
				lock.Unlock()
			}
		}(m)
	}
	wg.Wait()
	return data
}
