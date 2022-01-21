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
	ps "jobmon/persistent_store"
	"jobmon/utils"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/julienschmidt/httprouter"
)

var store = ps.Store{}
var config = conf.Configuration{}
var db database.DB
var jobCache = cache.LRUCache{}
var authManager = auth.AuthManager{}

func JobStart(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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
	store.Put(j)
}

func JobStop(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	utils.AllowCors(r, w.Header())
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

	go func() {
		jobMetadata, err := store.StopJob(id, stopJob)

		if err != nil {
			db.RunAggregation()
			if config.Prefetch {
				go func() {
					jobCache.Get(&jobMetadata)
				}()
			}
		}
	}()
}

func GetJobs(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	utils.AllowCors(r, w.Header())
	// TODO: Check auth and get by e.g. project id, ...
	// Get all for now
	jobs := store.GetAll()

	metrics := make(map[string]struct{})
	for _, v := range config.Metrics {
		for _, mc := range v {
			metrics[mc.Measurement] = struct{}{}
		}
	}
	keys := make([]string, 0, len(metrics))
	for k := range metrics {
		keys = append(keys, k)
	}

	jobListData := job.JobListData{Jobs: jobs, Config: job.JobListConfig{Metrics: keys, Partitions: config.Partitions, RadarChartMetrics: config.RadarChartMetrics}}
	data, err := json.Marshal(&jobListData)
	if err != nil {
		log.Printf("Could not marshal jobs to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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

	j, err := store.Get(id)
	if err != nil {
		log.Printf("Could not get job meta data")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if j.NumNodes == 1 {
		node = j.NodeList
	}

	var jobData database.JobData
	if node == "" {
		jobData, err = jobCache.Get(&j)
	} else {
		jobData, err = db.GetNodeJobData(&j, node)
	}
	if err != nil {
		log.Printf("Could not get job metric data: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

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

func Search(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	utils.AllowCors(r, w.Header())
	searchTerm := params.ByName("term")

	id, err := strconv.Atoi(searchTerm)
	if err == nil {
		_, err := store.Get(id)
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

func Logout(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
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

func GenerateAPIKey(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	utils.AllowCors(r, w.Header())
	jwt, err := authManager.GenerateJWT(auth.UserInfo{Role: auth.JOBCONTROL, Username: "api"}, true)
	if err != nil {
		log.Printf("Could not generate JWT: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write([]byte(jwt))
}

func main() {
	db = &database.InfluxDB{}
	config.Init()
	db.Init(config)
	store.Init(config, &db)
	jobCache.Init(config, &db)
	authManager.Init(config, &store)

	router := httprouter.New()
	router.PUT("/api/job_start", authManager.Protected(JobStart, auth.JOBCONTROL))
	router.PATCH("/api/job_stop/:id", authManager.Protected(JobStop, auth.JOBCONTROL))
	router.GET("/api/jobs", authManager.Protected(GetJobs, auth.USER))
	router.GET("/api/job/:id", authManager.Protected(GetJob, auth.USER))
	router.GET("/api/search/:term", authManager.Protected(Search, auth.USER))
	router.POST("/api/login", Login)
	router.POST("/api/logout", authManager.Protected(Logout, auth.USER))
	router.POST("/api/generateAPIKey", authManager.Protected(GenerateAPIKey, auth.ADMIN))

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
