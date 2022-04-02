package store

import (
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
)

type Store interface {
	Init(c config.Configuration, database *db.DB)
	Flush()

	// Add job metadata to store
	PutJob(job job.JobMetadata)
	// Get job metadata by job id
	GetJob(id int) (job.JobMetadata, error)
	// Get metadata of all jobs
	GetAllJobs() []job.JobMetadata
	// Get metadata of all jobs that fulfill the given predicate
	GetJobsByPred(pred JobPred) []job.JobMetadata
	// Mark the given job as stopped
	StopJob(id int, stopJob job.StopJob) (job job.JobMetadata, err error)

	// Get user session token from session storage
	GetUserSessionToken(username string) (string, bool)
	// Set user session token in session storage
	SetUserSessionToken(username string, token string)
	// Removes the user session token from the active sessions
	RemoveUserSessionToken(username string)
}