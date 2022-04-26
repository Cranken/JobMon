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
	PutJob(job job.JobMetadata) error
	// Get job metadata by job id
	GetJob(id int) (job.JobMetadata, error)
	// Get metadata of all jobs
	GetAllJobs() ([]job.JobMetadata, error)
	// Get jobs filtered by filter
	GetFilteredJobs(filter job.JobFilter) ([]job.JobMetadata, error)
	// Mark the given job as stopped
	StopJob(id int, stopJob job.StopJob) error
	// Updates the job metadata
	UpdateJob(job job.JobMetadata) error

	// Add tag to job
	AddTag(id int, tag *job.JobTag) error
	// Remove tag from job
	RemoveTag(id int, tag *job.JobTag) error

	// Get user session token from session storage
	GetUserSessionToken(username string) (string, bool)
	// Set user session token in session storage
	SetUserSessionToken(username string, token string)
	// Removes the user session token from the active sessions
	RemoveUserSessionToken(username string)
}

type UserSession struct {
	Username string `bun:",pk"`
	Token    string
}

type ColumnCount []map[string]interface{}
