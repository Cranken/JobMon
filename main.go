package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/julienschmidt/httprouter"
)

var store = Store{}
var config = Configuration{}
var db = DB{}
var jobCache = LRUCache{}

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	w.Write([]byte("Index"))
}

func JobStart(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(400)
		return
	}

	var job JobMetadata
	err = json.Unmarshal(body, &job)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		w.WriteHeader(400)
		return
	}

	w.WriteHeader(200)
	store.Put(job)
}

func JobStop(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(400)
		return
	}

	var stopJob StopJob
	err = json.Unmarshal(body, &stopJob)
	if err != nil {
		log.Printf("Could not parse json from http request body")
		w.WriteHeader(400)
		return
	}

	strId := params.ByName("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Id is not a valid integer")
		w.WriteHeader(400)
		return
	}
	w.WriteHeader(200)

	jobMetadata := store.StopJob(id, stopJob)

	db.RunTasks()
	if config.Prefetch {
		go func() {
			time.Sleep(10 * time.Second)
			jobCache.Get(jobMetadata)
		}()
	}
}

func GetJobs(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// TODO: Check auth and get by e.g. project id, ...
	// Get all for now
	jobs := store.GetAll()

	data, err := json.Marshal(&jobs)
	if err != nil {
		log.Printf("Could not marshal jobs to json")
		w.WriteHeader(500)
		return
	}
	allowCors(w.Header())
	w.Write(data)
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	start := time.Now()

	node := r.URL.Query().Get("node")
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Could not job id data")
		w.WriteHeader(500)
		return
	}

	// TODO: Check user authorization/authentification

	job, err := store.Get(id)
	if err != nil {
		log.Printf("Could not get job meta data")
		w.WriteHeader(500)
		return
	}

	var jobData JobData
	if node == "" {
		jobData, err = jobCache.Get(job)
	} else {
		jobData, err = db.GetNodeJobData(job, node)
	}
	if err != nil {
		log.Printf("Could not get job metric data: %v\n", err)
		w.WriteHeader(500)
		return
	}

	jsonData, err := json.Marshal(&jobData)
	if err != nil {
		log.Printf("Could not marshal job to json")
		w.WriteHeader(500)
		return
	}

	elapsed := time.Since(start)
	log.Printf("Get job %v took %s", job.Id, elapsed)

	allowCors(w.Header())
	w.Write(jsonData)
}

func main() {
	config.Init()
	log.Printf("%v\n", config)
	store.Init(config.DefaultTTL)
	db.Init(config)
	jobCache.Init(config.CacheSize, &db)

	router := httprouter.New()
	router.ServeFiles("/static/*filepath", http.Dir("static"))
	router.GET("/", Index)
	router.PUT("/api/job_start", JobStart)
	router.PATCH("/api/job_stop/:id", JobStop)
	router.GET("/api/jobs", GetJobs)
	router.GET("/api/job/:id", GetJob)

	registerCleanup()

	log.Fatal(http.ListenAndServe("127.0.0.1:8080", router))
}

func allowCors(header http.Header) {
	header.Set("Access-Control-Allow-Methods", header.Get("Allow"))
	header.Set("Access-Control-Allow-Origin", "*")
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
