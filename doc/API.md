This document lists all available backend API endpoints, their HTTP methods and used data types.

## [GET] /auth/oauth/login

OAuth login endpoint. Sets the "oauth_session" cookie and redirects to the external OAuth endpoint.

Body return data: None

## [GET] /auth/oauth/callback

OAuth login callback endpoint. Should not be called from the application. This is only called from the external OAuth endpoint after the user has successfully authenticated themselves.

On successful authentication: Sets the session token cookie for the user and redirects the user to the frontend main page.

Body return data: None

## [PUT] /api/job_start

Slurm endpoint to signal that a new job has started. Usually called by a Slurm prolog script.

Authentication level: job-control

Body request data: job.JobMetadata

## [PATCH] /api/job_stop/:id

Slurm endpoint to signal that a job has finished. Usually called by a Slurm epilog script.

Authentication level: job-control

URL Parameters:
- id: Specifies the job id

Body request data: job.StopJob

## [GET] /api/jobs

Fetches the jobs of a user or all in case of admins. Can filter the jobs that should be returned.

Authentication level:
- user: Only fetches the users jobs
- admin: Fetches all jobs

URL Query Parameters:
- Filter options: See router.go:parseGetJobParams for all available options

Body return data: job.JobListData

## [GET] /api/job/:id

Fetches the job data with the specified id.

Authentication level:
- user: Can only access their own jobs
- admin: Can access all jobs

URL Query Parameters:
- raw: Specifies if the raw data should be returned. Used for e.g., export to CSV function.
- node: Specifies a node for which detailed data should be returned.
- sampleInterval: Specfies the sample interval that should be used when aggregating the data.

Body return data: job.JobData

## [GET] /api/metric/:id

Fetches the data for a specific metric for the job with the given id.

Authentication level:
- user: Can only access their own jobs
- admin: Can access all jobs

URL Query Parameters:
- metric: Specifies the GUID for which metric should be fetched. 
- aggFn: Specifies the aggregation function used in the db query.
- sampleInterval: Specfies the sample interval that should be used when aggregating the data.

Body return data: job.MetricData

## [GET] /api/live/:id

Websocket endpoint for the live job monitoring functionality. Sends new job metrics every *default sampleInterval* seconds.

URL Parameters:
- id: Job id

Authentication level: admin

Body return data: None

## [GET] /api/search/all/:term

Query the job or users for the specified term.

Authentication level: user

Potential search terms:
- Specify a username to search for the jobs of the user.
- Specify the job id to get redirected to the job's page.

Body return data: String with prefix "user:" or "job:" and the search term appended.

The frontend will redirect the user once received.

## [GET] /api/search/user/:term

Search for a user containing the given substring in it's username. The search is performed on all users with at least one job.

Authentication level: admin

Body return data: A list of usernames.

## [POST] /api/login

Login with local authentication. Sets the session token cookie on successful authentication.

Body request data: auth.AuthPayload

## [POST] /api/logout

Logs out the user given by their session token cookie. Removes the session from the store.

Authentication level: user

Body return data: None

## [POST] /api/generateAPIKey

Generates a new session token for the API user.

Authentication level: admin

Body return data: The new session token. Lifetime is set to "never" expire.

## [POST] /api/tags/add_tag

Adds the specified tag to the job.

Authentication level: user

URL Query Parameters:
- job: Specifies the job id

Body request data: job.JobTag

Body return data: job.JobTag

## [POST] /api/tags/remove_tag

Remove the specified tag from the job.

Authentication level: user

URL Query Parameters:
- job: Specifies the job id

Body request data: job.JobTag

## [GET] /api/config

Fetches the current config of the backend.

Currently only sends parts of the config for:
- Metrics
- Partiton

Authentication level: admin

Body return data: config.Configuration

## [PATCH] /api/config/update

Updates the config of the backend.

Currently only updates parts of the config for:
- Metrics
- Partiton

Authentication level: admin

Body request data: config.Configuration

Body return data: config.Configuration

## [GET] /api/admin/livelog

Websocket endpoint for the live logging functionality. Sends the currently buffered log messages on establishment.

Authentication level: admin

Body return data: None

## [POST] /api/admin/refresh_metadata/:id

Forces a refresh of the metadata for the given job id.

URL Parameters:
- id: Job id

Authentication level: admin

Body return data: job.JobMetadata

## [GET] /api/config/users/:user

Query the config for the given user.

URL Parameters:
- user: User which will be queried

Authentication level: admin

Body return data: store.UserRoles

## [PATCH] /api/config/users/:user

Update the config for the given user.

URL Parameters:
- user: User which will be updated

Authentication level: admin

Body request data: store.UserRoles

Body return data: store.UserRoles

## [POST] /api/notify/admin

Sends a notification the the admins to request a role.

Authentication level: none

Body request data: auth.UserInfo

Body return data: none

## [GET] /api/ping

API-function to ping the backend. This function is used to check the liveness of the backend.

Authentication level: none

Body request data: none

Body return data: The current timestamp.
