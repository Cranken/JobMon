package analysis

import (
	"sync"
	"time"

	"jobmon/changepoint"
	"jobmon/job"
)

func ChangePointDetection(j *job.JobData) map[string][]time.Time {
	var wg sync.WaitGroup
	var lock sync.Mutex
	data := make(map[string][]time.Time)
	for _, m := range j.MetricData {
		wg.Add(1)
		go func(m job.MetricData) {
			defer wg.Done()
			for _, v := range m.Data {
				values := make([]float64, 0)
				for _, vi := range v {
					values = append(values, vi["_value"].(float64))
				}
				cpts := changepoint.NonParametric(values, 1, 5)
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
