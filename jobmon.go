package main

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
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/julienschmidt/httprouter"
)

var store jobstore.Store
var config = conf.Configuration{}
var db database.DB
var jobCache = cache.LRUCache{}
var authManager = auth.AuthManager{}

func JobStart(w http.ResponseWriter, r *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(r, w.Header())
	body, err := ioutil.ReadAll(r.Body)
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
	store.PutJob(j)
}

func JobStop(w http.ResponseWriter, r *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(r, w.Header())

	// Parse job information
	body, err := ioutil.ReadAll(r.Body)
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
		err := store.StopJob(id, stopJob)

		if err != nil {
			// Run aggregation tasks to calculate metadata metrics and (if enabled) prefetch job data
			db.RunAggregation()
			if config.Prefetch {
				go func() {
					jobMetadata, err := store.GetJob(id)
					if err == nil {
						dur, _ := time.ParseDuration(config.SampleInterval)
						_, secs := jobMetadata.CalculateSampleIntervals(dur)
						bestInterval := time.Duration(secs) * time.Second
						jobCache.Get(&jobMetadata, bestInterval)
					}
				}()
			}
		}
	}()
}

func GetJobs(w http.ResponseWriter, r *http.Request, _ httprouter.Params, user auth.UserInfo) {
	utils.AllowCors(r, w.Header())
	filter := parseGetJobParams(r.URL.Query())
	jobs, err := store.GetFilteredJobs(filter)
	// TODO: Check auth and get by e.g. project id, ...
	// Get all for now
	// jobs, err := store.GetAllJobs()
	if err != nil {
		log.Printf("Could not get jobs %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	metrics := make(map[string]struct{})
	for _, v := range config.Metrics {
		metrics[v.Measurement] = struct{}{}
	}
	keys := make([]string, 0, len(metrics))
	for k := range metrics {
		keys = append(keys, k)
	}

	var tags []job.JobTag
	if user.Role == auth.ADMIN {
		// Get all if user is admin
		tags, err = store.GetJobTags("")
	} else {
		tags, err = store.GetJobTags(user.Username)
	}
	if err != nil {
		log.Printf("Could not get job tags %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jobListData := job.JobListData{Jobs: jobs, Config: job.JobListConfig{Metrics: keys, RadarChartMetrics: config.RadarChartMetrics, Partitions: config.Partitions, Tags: tags}}
	data, err := json.Marshal(&jobListData)
	if err != nil {
		log.Printf("Could not marshal jobs to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params, user auth.UserInfo) {
	utils.AllowCors(r, w.Header())
	start := time.Now()

	node := r.URL.Query().Get("node")
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Could not job id data")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: Check user authorization/authentification

	// Get job metadata from store
	j, err := store.GetJob(id)
	if err != nil {
		log.Printf("Could not get job meta data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Calculate best sample interval
	dur, _ := time.ParseDuration(config.SampleInterval)
	intervals, secs := j.CalculateSampleIntervals(dur)
	bestInterval := time.Duration(secs) * time.Second

	sampleInterval := bestInterval
	querySampleInterval := r.URL.Query().Get("sampleInterval")
	if querySampleInterval != "" {
		parsedDuration, err := time.ParseDuration(querySampleInterval + "s")
		if err == nil {
			sampleInterval = parsedDuration
		}
	}

	// Get job data
	var jobData database.JobData
	if node == "" && querySampleInterval == "" {
		jobData, err = jobCache.Get(&j, bestInterval)
	} else {
		jobData, err = db.GetNodeJobData(&j, node, sampleInterval)
	}
	if err != nil {
		log.Printf("Could not get job metric data: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jobData.SampleInterval = sampleInterval.Seconds()
	jobData.SampleIntervals = intervals

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

func Search(w http.ResponseWriter, r *http.Request, params httprouter.Params, user auth.UserInfo) {
	utils.AllowCors(r, w.Header())
	searchTerm := params.ByName("term")

	id, err := strconv.Atoi(searchTerm)
	if err == nil {
		_, err := store.GetJob(id)
		if err == nil {
			w.Write([]byte(fmt.Sprintf("job:%v", id)))
			return
		}
	}

	w.Write([]byte(fmt.Sprintf("user:%v", searchTerm)))
}

func Login(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	utils.AllowCors(r, w.Header())
	body, err := ioutil.ReadAll(r.Body)
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

	user, err := authManager.AuthUser(dat.Username, dat.Password)
	if err != nil {
		log.Printf("Could not authenticate user: %v", err)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	err = authManager.AppendJWT(user, dat.Remember, w)
	if err != nil {
		log.Printf("Could not generate JWT: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func Logout(w http.ResponseWriter, r *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(r, w.Header())
	body, err := ioutil.ReadAll(r.Body)
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
	authManager.Logout(dat.Username)

	http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
	w.WriteHeader(http.StatusOK)
}

func GenerateAPIKey(w http.ResponseWriter, r *http.Request, params httprouter.Params, _ auth.UserInfo) {
	utils.AllowCors(r, w.Header())
	jwt, err := authManager.GenerateJWT(auth.UserInfo{Role: auth.JOBCONTROL, Username: "api"}, true)
	if err != nil {
		log.Printf("Could not generate JWT: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write([]byte(jwt))
}

func AddTag(w http.ResponseWriter, r *http.Request, params httprouter.Params, user auth.UserInfo) {
	job, tag, ok := parseTag(w, r)
	if ok {
		tag.CreatedBy = user.Username
		tag.Type = user.Role
		store.AddTag(job.Id, &tag)
		jobCache.UpdateJob(job.Id)

		jsonData, err := json.Marshal(&tag)
		if err != nil {
			log.Printf("Could not marshal tag to json")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Write(jsonData)
	}
}

func RemoveTag(w http.ResponseWriter, r *http.Request, params httprouter.Params, user auth.UserInfo) {
	job, tag, ok := parseTag(w, r)
	if ok {
		err := store.RemoveTag(job.Id, &tag)
		if err != nil {
			log.Println(err)
		}
		jobCache.UpdateJob(job.Id)
	}
}

func parseTag(w http.ResponseWriter, r *http.Request) (job job.JobMetadata, tag job.JobTag, ok bool) {
	utils.AllowCors(r, w.Header())

	jobStr := r.URL.Query().Get("job")

	jobId, err := strconv.Atoi(jobStr)
	if err != nil {
		log.Printf("Could not parse job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, err := ioutil.ReadAll(r.Body)
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

	job, err = store.GetJob(jobId)
	if err != nil {
		log.Printf("Could not get job with id: %v", jobId)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	ok = true
	return
}

func main() {
	config.Init()
	db = &database.InfluxDB{}

	switch config.JobStore.Type {
	case "postgres":
		store = &jobstore.PostgresStore{}
	default:
		store = &jobstore.MemoryStore{}
	}

	db.Init(config)
	store.Init(config, &db)
	jobCache.Init(config, &db, &store)
	authManager.Init(config, &store)

	// part := "accelerated"
	// jobs, err := store.GetFilteredJobs(job.JobFilter{Partition: &part})
	// if err == nil {
	// 	for _, jm := range jobs {
	// 		s := job.StopJob{StopTime: jm.StopTime, ExitCode: jm.ExitCode}
	// 		store.StopJob(jm.Id, s)
	// 	}
	// }

	// var memStore jobstore.Store
	// memStore = &jobstore.MemoryStore{}
	// memStore.Init(config, &db)

	// store.(*jobstore.PostgresStore).Migrate(&memStore)

	router := httprouter.New()
	router.PUT("/api/job_start", authManager.Protected(JobStart, auth.JOBCONTROL))
	router.PATCH("/api/job_stop/:id", authManager.Protected(JobStop, auth.JOBCONTROL))
	router.GET("/api/jobs", authManager.Protected(GetJobs, auth.USER))
	router.GET("/api/job/:id", authManager.Protected(GetJob, auth.USER))
	router.GET("/api/search/:term", authManager.Protected(Search, auth.USER))
	router.POST("/api/login", Login)
	router.POST("/api/logout", authManager.Protected(Logout, auth.USER))
	router.POST("/api/generateAPIKey", authManager.Protected(GenerateAPIKey, auth.ADMIN))
	router.POST("/api/tags/add_tag", authManager.Protected(AddTag, auth.USER))
	router.POST("/api/tags/remove_tag", authManager.Protected(RemoveTag, auth.USER))

	registerCleanup()

	log.Fatal(http.ListenAndServe(":8080", router))
}

func registerCleanup() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-sigChan
		store.Flush()
		db.Close()
		os.Exit(0)
	}()
}

func parseGetJobParams(params url.Values) (filter job.JobFilter) {
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
