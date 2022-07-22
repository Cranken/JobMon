package router

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"jobmon/auth"
	conf "jobmon/config"
	database "jobmon/db"
	"jobmon/job"
	cache "jobmon/lru_cache"
	jobstore "jobmon/store"
	"jobmon/utils"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/julienschmidt/httprouter"
)

type Router struct {
	store       jobstore.Store
	config      *conf.Configuration
	db          database.DB
	jobCache    *cache.LRUCache
	authManager *auth.AuthManager
	upgrader    websocket.Upgrader
}

func (r *Router) Init(store jobstore.Store, config *conf.Configuration, db database.DB, jobCache *cache.LRUCache, authManager *auth.AuthManager) {
	r.store = store
	r.config = config
	r.db = db
	r.jobCache = jobCache
	r.authManager = authManager
	r.upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

	router := httprouter.New()
	router.PUT("/api/job_start", authManager.Protected(r.JobStart, auth.JOBCONTROL))
	router.PATCH("/api/job_stop/:id", authManager.Protected(r.JobStop, auth.JOBCONTROL))
	router.GET("/api/jobs", authManager.Protected(r.GetJobs, auth.USER))
	router.GET("/api/job/:id", authManager.Protected(r.GetJob, auth.USER))
	router.GET("/api/live/:id", authManager.Protected(r.LiveMonitoring, auth.USER))
	router.GET("/api/search/:term", authManager.Protected(r.Search, auth.USER))
	router.POST("/api/login", r.Login)
	router.POST("/api/logout", authManager.Protected(r.Logout, auth.USER))
	router.POST("/api/generateAPIKey", authManager.Protected(r.GenerateAPIKey, auth.ADMIN))
	router.POST("/api/tags/add_tag", authManager.Protected(r.AddTag, auth.USER))
	router.POST("/api/tags/remove_tag", authManager.Protected(r.RemoveTag, auth.USER))

	log.Fatal(http.ListenAndServe(":8080", router))
}

func (r *Router) JobStart(w http.ResponseWriter, req *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(req, w.Header())
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		errStr := fmt.Sprintln("JobStart: Could not read http request body")
		log.Println(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	var j job.JobMetadata
	err = json.Unmarshal(body, &j)
	if err != nil {
		errStr := fmt.Sprintf("JobStart: Could not unmarshal http request body %v\n", string(body))
		log.Println(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte{})
	r.store.PutJob(j)
}

func (r *Router) JobStop(w http.ResponseWriter, req *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(req, w.Header())

	// Parse job information
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		errStr := fmt.Sprintln("JobStop: Could not read http request body")
		log.Println(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	var stopJob job.StopJob
	err = json.Unmarshal(body, &stopJob)
	if err != nil {
		errStr := fmt.Sprintf("JobStop: Could not parse json from http request body %v", string(body))
		log.Println(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	strId := params.ByName("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		errStr := fmt.Sprintf("JobStop: Id is not a valid integer %v", strId)
		log.Println(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Success"))

	// Mark job as stopped in store
	go func() {
		err := r.store.StopJob(id, stopJob)

		if err != nil {
			// Run aggregation tasks to calculate metadata metrics and (if enabled) prefetch job data
			r.db.RunAggregation()
			if r.config.Prefetch {
				go func() {
					jobMetadata, err := r.store.GetJob(id)
					if err == nil {
						dur, _ := time.ParseDuration(r.config.SampleInterval)
						_, secs := jobMetadata.CalculateSampleIntervals(dur)
						bestInterval := time.Duration(secs) * time.Second
						r.jobCache.Get(&jobMetadata, bestInterval)
					}
				}()
			}
		}
	}()
}

func (r *Router) GetJobs(w http.ResponseWriter, req *http.Request, _ httprouter.Params, user auth.UserInfo) {
	utils.AllowCors(req, w.Header())
	filter := r.parseGetJobParams(req.URL.Query())
	jobs, err := r.store.GetFilteredJobs(filter)
	// TODO: Check auth and get by e.g. project id, ...
	// Get all for now
	// jobs, err := store.GetAllJobs()
	if err != nil {
		log.Printf("Could not get jobs %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	metrics := make(map[string]struct{})
	for _, v := range r.config.Metrics {
		metrics[v.Measurement] = struct{}{}
	}
	keys := make([]string, 0, len(metrics))
	for k := range metrics {
		keys = append(keys, k)
	}

	var tags []job.JobTag
	if user.Role == auth.ADMIN {
		// Get all if user is admin
		tags, err = r.store.GetJobTags("")
	} else {
		tags, err = r.store.GetJobTags(user.Username)
	}
	if err != nil {
		log.Printf("Could not get job tags %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jobListData := job.JobListData{Jobs: jobs, Config: job.JobListConfig{
		Metrics:           keys,
		RadarChartMetrics: r.config.RadarChartMetrics,
		Partitions:        r.config.Partitions, Tags: tags}}
	data, err := json.Marshal(&jobListData)
	if err != nil {
		log.Printf("Could not marshal jobs to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func (r *Router) GetJob(w http.ResponseWriter, req *http.Request, params httprouter.Params, user auth.UserInfo) {
	utils.AllowCors(req, w.Header())
	start := time.Now()

	node := req.URL.Query().Get("node")
	raw := req.URL.Query().Get("raw") == "true"
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Could not job id data")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: Check user authorization/authentification

	// Get job metadata from store
	j, err := r.store.GetJob(id)
	if err != nil {
		log.Printf("Could not get job meta data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if j.NumNodes == 1 {
		node = j.NodeList
	}

	// Calculate best sample interval
	dur, _ := time.ParseDuration(r.config.SampleInterval)
	intervals, secs := j.CalculateSampleIntervals(dur)
	bestInterval := time.Duration(secs) * time.Second

	sampleInterval := bestInterval
	querySampleInterval := req.URL.Query().Get("sampleInterval")
	if querySampleInterval != "" {
		parsedDuration, err := time.ParseDuration(querySampleInterval + "s")
		if err == nil {
			sampleInterval = parsedDuration
		}
	}

	// Get job data
	origStartTime := j.StartTime
	if j.IsRunning {
		j.StartTime = int(time.Now().Unix()) - 3600
	}
	var jobData database.JobData
	if node == "" && querySampleInterval == "" && !j.IsRunning && !raw {
		jobData, err = r.jobCache.Get(&j, bestInterval)
	} else if j.IsRunning {
		j.StopTime = int(time.Now().Unix())
		jobData, err = r.db.GetNodeJobData(&j, "", bestInterval, raw)
	} else {
		jobData, err = r.db.GetNodeJobData(&j, node, sampleInterval, raw)
	}
	if err != nil {
		log.Printf("Could not get job metric data: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jobData.SampleInterval = sampleInterval.Seconds()
	jobData.SampleIntervals = intervals
	j.StartTime = origStartTime

	// Send data
	jsonData, err := json.Marshal(&jobData)
	if err != nil {
		log.Printf("Could not marshal job to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start)
	log.Printf("Get job %v took %s", j.Id, elapsed)

	w.Write(jsonData)
}

func (r *Router) Search(w http.ResponseWriter, req *http.Request, params httprouter.Params, user auth.UserInfo) {
	utils.AllowCors(req, w.Header())
	searchTerm := params.ByName("term")

	id, err := strconv.Atoi(searchTerm)
	if err == nil {
		_, err := r.store.GetJob(id)
		if err == nil {
			w.Write([]byte(fmt.Sprintf("job:%v", id)))
			return
		}
	}

	w.Write([]byte(fmt.Sprintf("user:%v", searchTerm)))
}

func (r *Router) Login(w http.ResponseWriter, req *http.Request, params httprouter.Params) {
	utils.AllowCors(req, w.Header())
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var dat auth.AuthPayload
	err = json.Unmarshal(body, &dat)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	user, err := r.authManager.AuthUser(dat.Username, dat.Password)
	if err != nil {
		log.Printf("Could not authenticate user: %v", err)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	err = r.authManager.AppendJWT(user, dat.Remember, w)
	if err != nil {
		log.Printf("Could not generate JWT: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (r *Router) Logout(w http.ResponseWriter, req *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(req, w.Header())
	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var dat auth.AuthPayload
	err = json.Unmarshal(body, &dat)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if dat.Username == "" {
		log.Printf("No username given on logout")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	r.authManager.Logout(dat.Username)

	http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
	w.WriteHeader(http.StatusOK)
}

func (r *Router) GenerateAPIKey(w http.ResponseWriter, req *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(req, w.Header())
	jwt, err := r.authManager.GenerateJWT(auth.UserInfo{Role: auth.JOBCONTROL, Username: "api"}, true)
	if err != nil {
		log.Printf("Could not generate JWT: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write([]byte(jwt))
}

func (r *Router) AddTag(w http.ResponseWriter, req *http.Request, params httprouter.Params, user auth.UserInfo) {
	job, tag, ok := r.parseTag(w, req)
	if ok {
		tag.CreatedBy = user.Username
		tag.Type = user.Role
		r.store.AddTag(job.Id, &tag)
		r.jobCache.UpdateJob(job.Id)

		jsonData, err := json.Marshal(&tag)
		if err != nil {
			log.Printf("Could not marshal tag to json")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Write(jsonData)
	}
}

func (r *Router) RemoveTag(w http.ResponseWriter, req *http.Request, params httprouter.Params, user auth.UserInfo) {
	job, tag, ok := r.parseTag(w, req)
	if ok {
		err := r.store.RemoveTag(job.Id, &tag)
		if err != nil {
			log.Println(err)
		}
		r.jobCache.UpdateJob(job.Id)
	}
}

func (r *Router) LiveMonitoring(w http.ResponseWriter, req *http.Request, params httprouter.Params, user auth.UserInfo) {
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Could not job id data")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	c, err := r.upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Print("error upgrading connection:", err)
		return
	}

	j, err := r.store.GetJob(id)
	if err != nil {
		log.Printf("Could not get job meta data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	monitor, done := r.db.CreateLiveMonitoringChannel(&j)

	go func() {
		for {
			t, msg, _ := c.ReadMessage()
			if t == -1 {
				done <- true
				c.Close()
				return
			}
			var wsMsg WSMsg
			err := json.Unmarshal(msg, &wsMsg)
			if err == nil {
				switch wsMsg.Type {
				case WSLoadMetrics:
					var wsLoadMetricsMsg WSLoadMetricsMsg
					err = json.Unmarshal(msg, &wsLoadMetricsMsg)
					if err == nil {
						origStartTime := j.StartTime
						origStopTime := j.StopTime
						if j.StartTime <= wsLoadMetricsMsg.StartTime {
							j.StartTime = wsLoadMetricsMsg.StartTime
						}
						j.StopTime = wsLoadMetricsMsg.StopTime
						dur, _ := time.ParseDuration(r.config.SampleInterval)
						_, secs := j.CalculateSampleIntervals(dur)
						bestInterval := time.Duration(secs) * time.Second
						data, err := r.db.GetNodeJobData(&j, "", bestInterval, false)
						j.StartTime = origStartTime
						j.StopTime = origStopTime
						if err == nil {
							var resp WSLoadMetricsResponseMsg
							resp.Type = WSLoadMetricsResponse
							resp.MetricData = data.MetricData
							c.WriteJSON(resp)
						}
					}
				}
			}
		}
	}()

	go func() {
		for {
			data, ok := <-monitor
			if ok {
				var resp WSLatestMetricsMsg
				resp.Type = WSLatestMetrics
				resp.MetricData = data
				c.WriteJSON(resp)
			} else {
				return
			}
		}
	}()
}

func (r *Router) parseTag(w http.ResponseWriter, req *http.Request) (job job.JobMetadata, tag job.JobTag, ok bool) {
	utils.AllowCors(req, w.Header())

	jobStr := req.URL.Query().Get("job")

	jobId, err := strconv.Atoi(jobStr)
	if err != nil {
		log.Printf("Could not parse job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, err := ioutil.ReadAll(req.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = json.Unmarshal(body, &tag)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	job, err = r.store.GetJob(jobId)
	if err != nil {
		log.Printf("Could not get job with id: %v", jobId)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	ok = true
	return
}

func (r *Router) parseGetJobParams(params url.Values) (filter job.JobFilter) {
	parseRangeFilter := func(str string) (rf *job.RangeFilter) {
		parts := strings.Split(str, ",")
		if len(parts) != 2 {
			return nil
		}
		rf = &job.RangeFilter{}
		if p0, err := strconv.Atoi(parts[0]); err == nil {
			rf.From = &p0
		}
		if p1, err := strconv.Atoi(parts[1]); err == nil {
			rf.To = &p1
		}
		return
	}
	if str := params.Get("UserId"); str != "" {
		i, err := strconv.Atoi(str)
		if err != nil {
			filter.UserId = &i
		}
	}
	if str := params.Get("UserName"); str != "" {
		filter.UserName = &str
	}
	if str := params.Get("GroupId"); str != "" {
		i, err := strconv.Atoi(str)
		if err != nil {
			filter.GroupId = &i
		}
	}
	if str := params.Get("GroupName"); str != "" {
		filter.GroupName = &str
	}
	if str := params.Get("IsRunning"); str != "" {
		if str == "true" {
			v := true
			filter.IsRunning = &v
		}
		if str == "false" {
			v := false
			filter.IsRunning = &v
		}
	}
	if str := params.Get("Partition"); str != "" {
		filter.Partition = &str
	}

	if str := params.Get("NumNodes"); str != "" {
		filter.NumNodes = parseRangeFilter(str)
	}
	if str := params.Get("NumTasks"); str != "" {
		filter.NumTasks = parseRangeFilter(str)
	}
	if str := params.Get("NumGpus"); str != "" {
		filter.NumGpus = parseRangeFilter(str)
	}
	if str := params.Get("Time"); str != "" {
		filter.Time = parseRangeFilter(str)
	}
	if str := params.Get("Tags"); str != "" {
		tags := strings.Split(str, ",")
		tagIds := make([]job.JobTag, 0)
		for _, v := range tags {
			i, err := strconv.Atoi(v)
			if err == nil {
				tagIds = append(tagIds, job.JobTag{Id: int64(i)})
			}
		}
		filter.Tags = &tagIds
	}
	return filter
}