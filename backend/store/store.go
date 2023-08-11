package store

import (
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
)

// Store is the interface that wraps a list of methods used for setting up, closing and working
// with a PostgreSQL database.
type Store interface {

	// Init initializes the Postgres database based on the configuration
	// c and InfluxDB database.
	Init(c config.Configuration, database *db.DB)

	// Shuts down the connection to the Postgres database.
	Flush()

	// PutJob adds job metadata to store
	PutJob(job job.JobMetadata) error

	// GetJob returns metadata for job with jobid id.
	GetJob(id int) (job.JobMetadata, error)

	// GetAllJobs returns metadata information for all jobs.
	GetAllJobs() ([]job.JobMetadata, error)

	// GetFilteredJobs returns metadata information for all jobs that
	// satisfy the predicate filter.
	GetFilteredJobs(filter job.JobFilter) ([]job.JobMetadata, error)

	// StopJob mark a job identified with id as stopped.
	StopJob(id int, stopJob job.StopJob) error

	// UpdateJob update the job metadata.
	UpdateJob(job job.JobMetadata) error

	// GetJobTags returns all job tags for the user 'username'
	GetJobTags(username string) ([]job.JobTag, error)

	// GetJobTagsByName returns all job tags containing the given string in their name
	GetJobTagsByName(searchTerm string, username string) ([]job.JobTag, error)

	// GetAllUsersWithJob returns all users with at least one job
	GetAllUsersWithJob() ([]string, error)

	// GetUserWithJob returns all users with at least one job with a username containing the search term.
	GetUserWithJob(searchTerm string) ([]string, error)

	// AddTag adds tag to the job identified with id.
	AddTag(id int, tag *job.JobTag) error

	// RemoveTag removes tag from the job identified with id.
	RemoveTag(id int, tag *job.JobTag) error

	// GetUserSessionToken returns the session token for user 'username'.
	GetUserSessionToken(username string) (string, bool)

	// SetUserSessionToken sets the token for user 'username'.
	SetUserSessionToken(username string, token string)

	// RemoveUserSession removes session for user 'username'.
	RemoveUserSession(username string)

	// GetUserRoles returns the roles of user 'username'.
	GetUserRoles(username string) (UserRoles, bool)

	// SetUserRoles sets roles for user 'username'.
	SetUserRoles(username string, roles []string)

	// Returns jobs that contain the given search term in their id, job-name or account-name
	GetJobByString(searchTerm string, username string) ([]job.JobMetadata, error)

	// Writes a metric config to the storage
	WriteMetricConfig(config *config.MetricConfig) error
}

// UserSession represents a User session consisting of a username and a token.
type UserSession struct {
	Username string `bun:",pk"`
	Token    string
}

// UserRoles represents the roles of a user.
type UserRoles struct {
	Username string `bun:",pk"`
	Roles    []string
}

// deprecated
type ColumnCount []map[string]interface{}
