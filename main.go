package main

import (
	"encoding/json"
	"fmt"
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
var authManager = AuthManager{}

func JobStart(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var job JobMetadata
	err = json.Unmarshal(body, &job)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	w.WriteHeader(200)
	store.Put(job)
}

func JobStop(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var stopJob StopJob
	err = json.Unmarshal(body, &stopJob)
	if err != nil {
		log.Printf("Could not parse json from http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	strId := params.ByName("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Id is not a valid integer")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
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

	jobListData := JobListData{Jobs: jobs, DisplayMetrics: config.JobListMetrics}
	data, err := json.Marshal(&jobListData)
	if err != nil {
		log.Printf("Could not marshal jobs to json")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	allowCors(r, w.Header())
	w.Write(data)
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	start := time.Now()

	node := r.URL.Query().Get("node")
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Could not job id data")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// TODO: Check user authorization/authentification

	job, err := store.Get(id)
	if err != nil {
		log.Printf("Could not get job meta data")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusInternalServerError)
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
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(&jobData)
	if err != nil {
		log.Printf("Could not marshal job to json")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start)
	log.Printf("Get job %v took %s", job.Id, elapsed)

	allowCors(r, w.Header())
	w.Write(jsonData)
}

func Search(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	searchTerm := params.ByName("term")

	id, err := strconv.Atoi(searchTerm)
	if err == nil {
		_, err := store.Get(id)
		if err == nil {
			allowCors(r, w.Header())
			w.Write([]byte(fmt.Sprintf("job:%v", id)))
			return
		}
	}

	allowCors(r, w.Header())
	w.Write([]byte(fmt.Sprintf("user:%v", searchTerm)))
}

func Login(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var dat AuthPayload
	err = json.Unmarshal(body, &dat)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	user, err := authManager.AuthUser(dat.Username, dat.Password)
	if err != nil {
		log.Printf("Could not authenticate user: %v", err)
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	err = authManager.AppendJWT(user, w)
	if err != nil {
		log.Printf("Could not generate JWT: %v", err)
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	allowCors(r, w.Header())
	w.WriteHeader(200)
}

func Logout(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var dat AuthPayload
	err = json.Unmarshal(body, &dat)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if dat.Username == "" {
		log.Printf("No username given on logout")
		allowCors(r, w.Header())
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	authManager.Logout(dat.Username)

	allowCors(r, w.Header())
	http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
	w.WriteHeader(200)
}
func main() {
	config.Init()
	log.Printf("%v\n", config)
	db.Init(config)
	store.Init(config.DefaultTTL, &db)
	jobCache.Init(config.CacheSize, &db)
	authManager.Init(config)

	router := httprouter.New()
	router.PUT("/api/job_start", Protected(JobStart, JOBCONTROL))
	router.PATCH("/api/job_stop/:id", Protected(JobStop, JOBCONTROL))
	router.GET("/api/jobs", Protected(GetJobs, USER))
	router.GET("/api/job/:id", Protected(GetJob, USER))
	router.GET("/api/search/:term", Protected(Search, USER))
	router.POST("/api/login", Login)
	router.POST("/api/logout", Protected(Logout, USER))

	registerCleanup()

	log.Fatal(http.ListenAndServe("127.0.0.1:8080", router))
}

func allowCors(r *http.Request, header http.Header) {
	header.Set("Access-Control-Allow-Methods", r.Header.Get("Allow"))
	header.Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
	header.Set("Access-Control-Allow-Credentials", "true")
	header.Set("Access-Control-Expose-Headers", "Set-Cookie")
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
