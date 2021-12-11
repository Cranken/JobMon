package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/flosch/pongo2/v4"
	"github.com/julienschmidt/httprouter"
)

var store = Store{}
var indexTmpl *pongo2.Template
var jobsTmpl *pongo2.Template

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	err := indexTmpl.ExecuteWriter(pongo2.Context{}, w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func JobStart(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(400)
	}

	var job Job
	err = json.Unmarshal(body, &job)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		w.WriteHeader(400)
	}

	w.WriteHeader(200)
	store.Put(job)
}

func JobStop(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(400)
	}

	var stopJob StopJob
	err = json.Unmarshal(body, &stopJob)
	if err != nil {
		log.Printf("Could not parse json from http request body")
		w.WriteHeader(400)
	}

	strId := params.ByName("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Id is not a valid integer")
		w.WriteHeader(400)
	}
	w.WriteHeader(200)

	store.StopJob(id, stopJob)

	// Generate Snapshot of Dashboards and get Dashboard Id
}

func GetJobs(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// TODO: Check auth and get by e.g. project id, ...
	// Get all for now
	jobs := store.GetAll()

	err := jobsTmpl.ExecuteWriter(pongo2.Context{"jobs": jobs}, w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	strId := params.ByName("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Id is not a valid integer")
		w.WriteHeader(400)
	}

	// Check user authorization/authentification

	job, err := store.Get(id)
	if err != nil {
		log.Printf("Job does not exist")
		w.WriteHeader(400)
	}

	// TODO: Remove test output
	data, err := json.Marshal(&job)
	if err != nil {
		log.Printf("Could not marshal job to json")
		w.WriteHeader(500)
	}
	w.Write(data)

	// Fill page template with job metadata

	// Write filled template into Http response
}

func main() {
	store.Init(7 * 24 * 60 * 60)
	pongo2.RegisterFilter("convTime", UnixToTime)
	indexTmpl = pongo2.Must(pongo2.FromFile("frontend/index.html"))
	jobsTmpl = pongo2.Must(pongo2.FromFile("frontend/jobs.html"))

	router := httprouter.New()
	router.GET("/", Index)
	router.PUT("/api/job_start", JobStart)
	router.PATCH("/api/job_stop/:id", JobStop)
	router.GET("/jobs", GetJobs)
	router.GET("/jobs/:id", GetJob)

	log.Fatal(http.ListenAndServe(":8080", router))
}

func UnixToTime(in *pongo2.Value, _ *pongo2.Value) (*pongo2.Value, *pongo2.Error) {
	if !in.IsInteger() {
		return nil, &pongo2.Error{
			Filename: "filter:convTime",
		}
	}
	ts := in.Integer()
	time := time.Unix(int64(ts), 0)
	return pongo2.AsValue(time), nil
}
