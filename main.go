package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

var store = Store{}

func Index(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	fmt.Fprint(w, "Welcome!\n")
}

func JobStart(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	// id := params.ByName("id")

	// Parse data from request body

	// Complete Http Request

	// Put into storage/cache/db
}

func JobStop(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	// id := params.ByName("id")

	// Parse stopTime from body

	// Complete Http request

	// Generate Snapshot of Dashboards and get Dashboard Id

	// Update job in storage
}

func GetJobs(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Check user authorization/authentification

	// Get jobs from db based on users permission

	// Write into Http response
}

func GetJob(w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	// Check user authorization/authentification

	// Get job metadata from storage

	// Fill page template with job metadata

	// Write filled template into Http response
}

func main() {
	store.Init(7 * 24 * time.Hour)

	router := httprouter.New()
	router.GET("/", Index)
	router.PUT("/jobStart/:id", JobStart)
	router.PATCH("/jobStop/:id", JobStop)
	router.GET("/jobs", GetJobs)
	router.GET("/jobs/:id", GetJob)

	log.Fatal(http.ListenAndServe(":8080", router))
}
