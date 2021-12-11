package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
)

var store = Store{}

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	fmt.Fprint(w, "Welcome!\n")
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
	strId := params.ByName("id")
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Printf("Could not read http request body")
		w.WriteHeader(400)
	}

	var stopJob StopJob
	err = json.Unmarshal(body, &stopJob)
	if err != nil {
		log.Printf("Could not unmarshal http request body")
		w.WriteHeader(400)
	}

	id, err := strconv.Atoi(strId)
	if err != nil {
		log.Printf("Id not a valid integer")
		w.WriteHeader(400)
	}
	w.WriteHeader(200)
	store.StopJob(id, stopJob)

	// Generate Snapshot of Dashboards and get Dashboard Id
}

func GetJobs(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Check user authorization/authentification

	// Get jobs from db based on users permission

	// Write into Http response
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	id := params.ByName("id")

	// Check user authorization/authentification

	// Get job metadata from storage

	// Fill page template with job metadata

	// Write filled template into Http response
}

func main() {
	store.Init(7 * 24 * 60 * 60)

	router := httprouter.New()
	router.GET("/", Index)
	router.PUT("/job_start", JobStart)
	router.PATCH("/job_stop/:id", JobStop)
	router.GET("/jobs", GetJobs)
	router.GET("/jobs/:id", GetJob)

	log.Fatal(http.ListenAndServe(":8080", router))
}
