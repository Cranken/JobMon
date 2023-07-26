package router

import (
	"encoding/json"
	"fmt"
	"io"
	"jobmon/auth"
	conf "jobmon/config"
	database "jobmon/db"
	"jobmon/job"
	"jobmon/logging"
	cache "jobmon/lru_cache"
	"jobmon/notify"
	jobstore "jobmon/store"
	"jobmon/utils"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	// The uuid package generates and inspects UUIDs based on RFC 4122 and DCE 1.1: Authentication and Security Services.
	"github.com/google/uuid"
	// Gorilla WebSocket is a Go implementation of the WebSocket protocol
	"github.com/gorilla/websocket"
	// HttpRouter is a lightweight high performance HTTP request router (also called multiplexer or just mux for short) for Go
	"github.com/julienschmidt/httprouter"
	// Package slices defines various functions useful with slices of any type
	"golang.org/x/exp/slices"
)

// Router
type Router struct {
	store       jobstore.Store
	config      *conf.Configuration
	db          *database.DB
	jobCache    *cache.LRUCache
	authManager *auth.AuthManager
	upgrader    websocket.Upgrader
	logger      *utils.WebLogger
	notifier    *notify.Notifier
}

// Init starts up the server and sets up all the necessary handlers then it start the main web server.
func (r *Router) Init(
	store jobstore.Store,
	config *conf.Configuration,
	db *database.DB,
	jobCache *cache.LRUCache,
	authManager *auth.AuthManager,
	logger *utils.WebLogger,
	notifier *notify.Notifier) {

	r.store = store
	r.config = config
	r.db = db
	r.jobCache = jobCache
	r.authManager = authManager
	r.upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		}}
	r.logger = logger
	r.notifier = notifier

	router := httprouter.New()
	router.GET("/auth/oauth/login", r.LoginOAuth)
	router.GET("/auth/oauth/callback", r.LoginOAuthCallback)
	router.PUT("/api/job_start", authManager.Protected(r.JobStart, auth.JOBCONTROL))
	router.PATCH("/api/job_stop/:id", authManager.Protected(r.JobStop, auth.JOBCONTROL))
	router.GET("/api/jobs", authManager.Protected(r.GetJobs, auth.USER))
	router.GET("/api/job/:id", authManager.Protected(r.GetJob, auth.USER))
	router.GET("/api/metric/:id", authManager.Protected(r.GetMetric, auth.USER))
	router.GET("/api/live/:id", authManager.Protected(r.LiveMonitoring, auth.USER))
	router.GET("/api/search/user/:term", authManager.Protected(r.SearchUser, auth.ADMIN))
	router.GET("/api/search/job/:term", authManager.Protected(r.SearchJob, auth.USER))
	router.GET("/api/search/tag/:term", authManager.Protected(r.SearchTag, auth.USER))
	router.POST("/api/login", r.Login)
	router.POST("/api/logout", authManager.Protected(r.Logout, auth.USER))
	router.POST("/api/generateAPIKey", authManager.Protected(r.GenerateAPIKey, auth.ADMIN))
	router.POST("/api/tags/add_tag", authManager.Protected(r.AddTag, auth.USER))
	router.POST("/api/tags/remove_tag", authManager.Protected(r.RemoveTag, auth.USER))
	router.GET("/api/config", authManager.Protected(r.GetConfig, auth.ADMIN))
	router.PATCH("/api/config/update", authManager.Protected(r.UpdateConfig, auth.ADMIN))
	router.GET("/api/admin/livelog", authManager.Protected(r.LiveLog, auth.ADMIN))
	router.POST("/api/admin/refresh_metadata/:id", authManager.Protected(r.RefreshMetadata, auth.ADMIN))
	router.GET("/api/config/users/:user", authManager.Protected(r.GetUserConfig, auth.ADMIN))
	router.PATCH("/api/config/users/:user", authManager.Protected(r.SetUserConfig, auth.ADMIN))
	router.POST("/api/notify/admin", r.NotifyAdmin)
	router.GET("/api/ping", r.ping)

	server := &http.Server{
		Addr:    r.config.ListenAddress,
		Handler: router,
	}

	logging.Info("router: Init(): Listen and serve on ", r.config.ListenAddress)
	logging.Fatal(
		server.ListenAndServe())
}

func (r *Router) JobStart(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	_ auth.UserInfo) {

	// Read body
	body, err := io.ReadAll(req.Body)
	if err != nil {
		errStr := fmt.Sprintln("JobStart: Could not read http request body")
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	// Read job metadata from body
	var j job.JobMetadata
	err = json.Unmarshal(body, &j)
	if err != nil {
		errStr := fmt.Sprintf("JobStart: Could not unmarshal http request body %v\n", string(body))
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	logging.Info("Router: JobStart(): Read job start metadata for Job: ", j.Id)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte{})

	// Store job metadata
	err = r.store.PutJob(j)
	if err != nil {
		logging.Error("Router: JobStart(): Store job metadata failed: ", err)
	}
}

func (r *Router) JobStop(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	_ auth.UserInfo) {

	// Parse job information
	body, err := io.ReadAll(req.Body)
	if err != nil {
		errStr := fmt.Sprintln("router: JobStop(): Could not read http request body")
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	var stopJob job.StopJob
	err = json.Unmarshal(body, &stopJob)
	if err != nil {
		errStr := fmt.Sprintf("router: JobStop(): Could not parse json from http request body %v", string(body))
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	strId := params.ByName("id")
	id, err := strconv.Atoi(strId)
	if err != nil {
		errStr := fmt.Sprintf("router: JobStop(): Id is not a valid integer %v", strId)
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Success"))

	//TODO: Document better!
	// Mark job as stopped in stor
	go func() {
		err := r.store.StopJob(id, stopJob)

		if err != nil {
			// Run aggregation tasks to calculate metadata metrics and (if enabled) prefetch job data
			(*r.db).RunAggregation()
			if r.config.Prefetch {
				go func() {
					jobMetadata, err := r.store.GetJob(id)
					if err == nil {
						dur, _ := time.ParseDuration(r.config.SampleInterval)
						_, bestInterval := jobMetadata.CalculateSampleIntervals(dur)
						r.jobCache.Get(&jobMetadata, bestInterval)
					}
				}()
			}
		}
	}()
}

// GetJobs writes the job metadata to w, for the given request req and user.
func (r *Router) GetJobs(
	w http.ResponseWriter,
	req *http.Request,
	_ httprouter.Params,
	user auth.UserInfo) {
	filter := r.parseGetJobParams(req.URL.Query())

	// Check user authorization
	if !utils.Contains(user.Roles, auth.ADMIN) {
		filter.UserName = &user.Username
	}

	// Filter jobs
	jobs, err := r.store.GetFilteredJobs(filter)
	if err != nil {
		logging.Error("Could not get jobs: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Get job tags
	var tags []job.JobTag
	if utils.Contains(user.Roles, auth.ADMIN) {
		// Get all if user is admin
		tags, err = r.store.GetJobTags("")
	} else {
		tags, err = r.store.GetJobTags(user.Username)
	}
	if err != nil {
		logging.Error("Could not get job tags: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Send job list
	jobListData := job.JobListData{
		Jobs: jobs,
		Config: job.JobListConfig{
			RadarChartMetrics: r.config.RadarChartMetrics,
			Partitions:        r.config.Partitions,
			Tags:              tags,
		}}
	logging.Info("Router: GetJobs(): NumJobs = ", len(jobListData.Jobs))
	data, err := json.Marshal(&jobListData)
	if err != nil {
		logging.Error("Router: GetJobs(): Could not marshal jobs to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

// GetJob writes the job data to w, for the given request req, params and user.
func (r *Router) GetJob(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {

	logging.Info("Router: GetJob(): Processing request: ", req.URL.String())
	start := time.Now()

	// Get request parameters
	node := req.URL.Query().Get("node")
	raw := req.URL.Query().Get("raw") == "true"
	strId := params.ByName("id")

	// Read job ID
	id, err := strconv.Atoi(strId)
	if err != nil {
		logging.Error("router: GetJob(): Could not convert '", strId, "' to job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Get job metadata from store
	j, err := r.store.GetJob(id)
	if err != nil {
		logging.Error("router: GetJob(): Could not get job meta data (job ID = ", id, "): ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Check user authorization
	if !(utils.Contains(user.Roles, auth.ADMIN) || user.Username == j.UserName) {
		logging.Error("router: GetJob(): User ", user.Username, " is not permitted to access job ", j.Id)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Check authorization to access node metrics
	if node != "" {
		jobNodeMap := make(map[string]struct{})
		for _, jobNode := range strings.Split(j.NodeList, "|") {
			jobNodeMap[jobNode] = struct{}{}
		}
		for _, reqNode := range strings.Split(node, "|") {
			if _, ok := jobNodeMap[reqNode]; !ok {
				logging.Error("router: GetJob(): Node ", reqNode, "does not belong to job ", j.Id)
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}
	}

	// Calculate best sample interval
	dur, _ := time.ParseDuration(r.config.SampleInterval)
	intervals, bestInterval := j.CalculateSampleIntervals(dur)

	sampleInterval := bestInterval
	querySampleInterval := req.URL.Query().Get("sampleInterval")
	if querySampleInterval != "" {
		parsedDuration, err := time.ParseDuration(querySampleInterval + "s")
		if err == nil {
			sampleInterval = parsedDuration
		}
	}

	// Get job data
	origStartTime := j.StartTime
	if j.IsRunning {
		j.StartTime = int(time.Now().Unix()) - 3600
	}
	var jobData job.JobData
	if node == "" && querySampleInterval == "" && !j.IsRunning && !raw {
		jobData, err = r.jobCache.Get(&j, sampleInterval)
	} else {
		if j.IsRunning {
			j.StopTime = int(time.Now().Unix())
			node = ""
		}
		jobData, err = (*r.db).GetJobData(&j, node, sampleInterval, raw)
	}
	if err != nil {
		logging.Error("router: GetJob(): Could not get job metric data (job ID = ", id, "): ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jobData.SampleInterval = sampleInterval.Seconds()
	jobData.SampleIntervals = intervals
	j.StartTime = origStartTime

	// Send data
	jsonData, err := json.Marshal(&jobData)
	if err != nil {
		logging.Error("router: GetJob(): Could not marshal job to json (job ID = ", id, ")")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start)
	logging.Info("Router: GetJob (job ID = ", j.Id, ") took ", elapsed)

	w.Write(jsonData)
}

// GetMetric writes the metric data to w, for the given request req, params and user.
func (r *Router) GetMetric(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {

	strId := params.ByName("id")
	metric := req.URL.Query().Get("metric")
	aggFn := req.URL.Query().Get("aggFn")

	if metric == "" {
		logging.Error("router: GetMetric(): Metric was not provided")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if aggFn == "" {
		logging.Error("router: GetMetric(): aggFn was not provided")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(strId)
	if err != nil {
		logging.Error("router: GetMetric(): Could not convert '", strId, "' to job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Get job metadata from store
	j, err := r.store.GetJob(id)
	if err != nil {
		logging.Error("router: GetMetric(): Could not get job ", id, " meta data: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Check user authorization
	if !(utils.Contains(user.Roles, auth.ADMIN) ||
		user.Username == j.UserName) {
		logging.Error("router: GetMetric(): User '", user.Username, "' is not permitted to access job ", j.Id)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Calculate best sample interval
	dur, _ := time.ParseDuration(r.config.SampleInterval)
	_, bestInterval := j.CalculateSampleIntervals(dur)

	sampleInterval := bestInterval
	querySampleInterval := req.URL.Query().Get("sampleInterval")
	if querySampleInterval != "" {
		parsedDuration, err := time.ParseDuration(querySampleInterval + "s")
		if err == nil {
			sampleInterval = parsedDuration
		}
	}

	// Get job meta data
	if j.IsRunning {
		j.StartTime = int(time.Now().Unix()) - 3600
	}
	if j.IsRunning {
		j.StopTime = int(time.Now().Unix())
	}
	mc := slices.IndexFunc(
		r.config.Metrics,
		func(c conf.MetricConfig) bool {
			return c.GUID == metric
		})
	if mc == -1 {
		logging.Error("router: GetMetric(): Requested metric with GUID '", metric, "' not found")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Read performance metrics
	logging.Info("router: GetMetric(): Reading metric with GUID", metric)
	metricData, err := (*r.db).GetMetricDataWithAggFn(&j, r.config.Metrics[mc], aggFn, sampleInterval)
	if err != nil {
		logging.Error("router: GetMetric(): Could not get metric data: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Send data
	jsonData, err := json.Marshal(&metricData)
	if err != nil {
		logging.Error("router: GetMetric(): Could not marshal metric data to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	logging.Info("router: GetMetric(): Sending metric with GUID", metric)
	w.Write(jsonData)
}

// SearchUser uses http request parameter term as search term
// SearchUser searches users with jobs containing the search-term in their username
func (r *Router) SearchUser(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {

	searchTerm := params.ByName("term")

	data, err := r.store.GetUserWithJob(searchTerm)
	if err != nil {
		errStr := fmt.Sprintln("router: SearchUser(): Could not read users")
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		logging.Error("router: SearchUser(): Could not marshal search data to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

// SearchJob uses http request parameter term as search term
// SearchJob searches jobs with containing the search-term in their id, job-name or account-name
func (r *Router) SearchJob(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {

	searchTerm := params.ByName("term")

	data, err := r.store.GetJobByString(searchTerm)
	if err != nil {
		errStr := fmt.Sprintln("router: SearchJob(): Could not read jobs")
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		logging.Error("router: SearchJob(): Could not marshal search data to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

// SearchTag uses http request parameter term as search term
// SearchTag searches tags with containing the search-term in their name
func (r *Router) SearchTag(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {

	searchTerm := params.ByName("term")

	username := user.Username
	if utils.Contains(user.Roles, auth.ADMIN) {
		username = ""
	}

	data, err := r.store.GetJobTagsByName(searchTerm, username)
	if err != nil {
		errStr := fmt.Sprintln("router: SearchTag(): Could not read tags")
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		logging.Error("router: SearchTag(): Could not marshal search data to json")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

// Login writes to the WriteHeader of w, for the given request req, params and user
// if the authentication succeeded for a local user.
func (r *Router) Login(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params) {

	body, err := io.ReadAll(req.Body)
	if err != nil {
		logging.Error("Router: Login(): Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var dat auth.AuthPayload
	err = json.Unmarshal(body, &dat)
	if err != nil {
		logging.Error("Router: Login(): Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	user, err := r.authManager.AuthLocalUser(dat.Username, dat.Password)
	if err != nil {
		logging.Error("Router: Login(): Could not authenticate user '", dat.Username, "': ", err)
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Refuse access for job-control users to the frontend
	if utils.Contains(user.Roles, auth.JOBCONTROL) && dat.FrontendOnly {
		logging.Warning("Router: Login(): Login with job-control role in frontend-only mode by user '", dat.Username, "'")
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	err = r.authManager.AppendJWT(user, w)
	if err != nil {
		logging.Error("Router: Login(): Could not generate JWT for user '", dat.Username, "': ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (r *Router) LoginOAuth(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params) {

	// Check if auth manager is available
	if !r.authManager.OAuthAvailable() {
		errStr := fmt.Sprintln("OAuth login not available")
		logging.Error(errStr)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(errStr))
		return
	}

	// Generate session ID
	sessionID, err := r.authManager.GenerateSession()
	if err != nil {
		logging.Error("Router: LoginOAuth: Could not generate session: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Set cookie with session ID
	cookie := http.Cookie{
		Name:    "oauth_session",
		Value:   sessionID,
		Expires: time.Now().Add(365 * 24 * time.Hour),
	}
	http.SetCookie(w, &cookie)

	// Redirect after successful login
	url := r.authManager.GetOAuthCodeURL(sessionID)
	http.Redirect(w, req, url, http.StatusTemporaryRedirect)
	logging.Info("Router: LoginOAuth -> redirect to OAuth provider")
}

func (r *Router) LoginOAuthCallback(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params) {
	sessionID, _ := req.Cookie("oauth_session")

	// Check if session ID and state match
	state := req.FormValue("state")
	if state != sessionID.Value {
		logging.Error("Router: LoginOAuthCallback(): OAuth returned non matching state id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Get session from auth manager
	session, ok := r.authManager.GetSession(state)
	if !session.IsValid || !ok {
		logging.Error("Router: LoginOAuthCallback(): OAuth returned invalid state id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Read OAuth code
	code := req.FormValue("code")
	if code == "" {
		logging.Error("Router: LoginOAuthCallback(): OAuth returned no code")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Exchange OAuth token
	token, err := r.authManager.ExchangeOAuthToken(code)
	if err != nil {
		logging.Error("Router: LoginOAuthCallback(): Could not exchange token: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if !token.Valid() {
		logging.Error("Router: LoginOAuthCallback(): Token is invalid")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Read user information from OAuth provider
	userInfo, err := r.authManager.GetOAuthUserInfo(token)
	if err != nil {
		logging.Error("Router: LoginOAuthCallback(): Could not get oauth user info: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Read users roles from store
	userRoles, ok := r.store.GetUserRoles(userInfo.Username)
	if !ok {
		roles := []string{}
		userRoles.Roles = roles
		r.store.SetUserRoles(userInfo.Username, roles)
	}

	// Auto assign user role, if user self service is desired
	if len(userRoles.Roles) == 0 && r.config.AutoAssignUserRole {
		roles := []string{auth.USER}
		userRoles.Roles = roles
		r.store.SetUserRoles(userInfo.Username, roles)
	}

	user := auth.UserInfo{
		Username: userInfo.Username,
		Roles:    userRoles.Roles,
	}
	logging.Info("Router: LoginOAuthCallback(): User: ", user.Username, ", Roles: ", user.Roles)

	// Generate Java web token
	err = r.authManager.AppendJWT(user, w)
	if err != nil {
		logging.Error("Router: LoginOAuthCallback(): Could not generate JWT: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	http.Redirect(w, req, r.config.OAuth.AfterLoginRedirectUrl, http.StatusTemporaryRedirect)
	logging.Info("Router: LoginOAuthCallback(): redirect to: ", r.config.OAuth.AfterLoginRedirectUrl)
}

func (r *Router) Logout(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	_ auth.UserInfo) {

	// Read body
	body, err := io.ReadAll(req.Body)
	if err != nil {
		logging.Error("Router: Logout(): Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var dat auth.AuthPayload
	err = json.Unmarshal(body, &dat)
	if err != nil {
		logging.Error("Router: Logout(): Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if dat.Username == "" {
		logging.Error("Router: Logout(): No username given on logout")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Logout user in authManager
	r.authManager.Logout(dat.Username)

	// Clear authorization cooky
	http.SetCookie(w,
		&http.Cookie{
			Name:    "Authorization",
			Value:   "",
			Expires: time.Unix(0, 0),
			Path:    "/",
		})
	w.WriteHeader(http.StatusOK)

	logging.Info("Router: Logout(): logged out user ", dat.Username)
}

func (r *Router) GenerateAPIKey(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	_ auth.UserInfo) {
	jwt, err :=
		r.authManager.GenerateJWT(
			auth.UserInfo{
				Roles:    []string{auth.JOBCONTROL},
				Username: "api",
			},
		)
	if err != nil {
		logging.Error("Router: GenerateAPIKey(): Could not generate JWT: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Write([]byte(jwt))
	logging.Info("Router: GenerateAPIKey(): Generated API key")
}

func (r *Router) AddTag(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {
	job, tag, ok := r.parseTag(w, req)
	if ok {
		role := auth.USER
		if utils.Contains(user.Roles, auth.ADMIN) {
			role = auth.ADMIN
		}
		tag.CreatedBy = user.Username
		tag.Type = role
		r.store.AddTag(job.Id, &tag)
		r.jobCache.UpdateJob(job.Id)

		jsonData, err := json.Marshal(&tag)
		if err != nil {
			logging.Error("Router: AddTag(): Could not marshal tag to json")
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.Write(jsonData)
		logging.Info("Router: AddTag(): Added tag ", tag.Name, " to job ", job.Id)
	}
}

func (r *Router) RemoveTag(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {
	job, tag, ok := r.parseTag(w, req)
	if ok {
		err := r.store.RemoveTag(job.Id, &tag)
		if err != nil {
			logging.Error("Router: RemoveTag(): Failed to remove tag: ", err)
		}
		r.jobCache.UpdateJob(job.Id)
	}
}

func (r *Router) LiveMonitoring(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		logging.Error("Router: LiveMonitoring(): Could not convert '", strId, "' to job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	c, err := r.upgrader.Upgrade(w, req, nil)
	if err != nil {
		logging.Error("Router: LiveMonitoring(): error upgrading connection: ", err)
		return
	}

	j, err := r.store.GetJob(id)
	if err != nil {
		logging.Error("Router: LiveMonitoring(): Could not get job ", id, " meta data: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	monitor, done := (*r.db).CreateLiveMonitoringChannel(&j)

	go func() {
		for {
			t, msg, _ := c.ReadMessage()
			if t == -1 {
				done <- true
				c.Close()
				return
			}
			var wsMsg WSMsg
			err := json.Unmarshal(msg, &wsMsg)
			if err == nil {
				switch wsMsg.Type {
				case WSLoadMetrics:
					var wsLoadMetricsMsg WSLoadMetricsMsg
					err = json.Unmarshal(msg, &wsLoadMetricsMsg)
					if err == nil {
						origStartTime := j.StartTime
						origStopTime := j.StopTime
						if j.StartTime <= wsLoadMetricsMsg.StartTime {
							j.StartTime = wsLoadMetricsMsg.StartTime
						}
						j.StopTime = wsLoadMetricsMsg.StopTime
						dur, _ := time.ParseDuration(r.config.SampleInterval)
						_, bestInterval := j.CalculateSampleIntervals(dur)
						data, err := (*r.db).GetJobData(&j, "", bestInterval, false)
						j.StartTime = origStartTime
						j.StopTime = origStopTime
						if err == nil {
							var resp WSLoadMetricsResponseMsg
							resp.Type = WSLoadMetricsResponse
							resp.MetricData = data.MetricData
							c.WriteJSON(resp)
						}
					}
				}
			}
		}
	}()

	go func() {
		for {
			data, ok := <-monitor
			if ok {
				var resp WSLatestMetricsMsg
				resp.Type = WSLatestMetrics
				resp.MetricData = data
				c.WriteJSON(resp)
			} else {
				return
			}
		}
	}()
}

func (r *Router) GetConfig(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {

	// Restrict available configuration parameters for now
	conf := conf.Configuration{}
	conf.Metrics = r.config.Metrics
	conf.Partitions = r.config.Partitions
	conf.MetricCategories = r.config.MetricCategories

	data, err := json.Marshal(conf)
	if err != nil {
		logging.Error("Router: GetConfig(): Could not marshal config")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(data)
}

func (r *Router) UpdateConfig(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		logging.Error("Router: UpdateConfig(): Could not read update config request body: ", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Test if it is valid configuration
	conf := conf.Configuration{}
	err = json.Unmarshal(body, &conf)
	if err != nil {
		logging.Error("Router: UpdateConfig(): Could not unmarshal update config request body: ", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Add GUID for new metrics
	for i, mc := range conf.Metrics {
		if mc.GUID == "" {
			mc.GUID = uuid.New().String()
			conf.Metrics[i] = mc
		}
	}

	sort.SliceStable(
		conf.Metrics,
		func(i, j int) bool {
			return conf.Metrics[i].DisplayName < conf.Metrics[j].DisplayName
		})

	// Check if metric was removed and remove all references
	deletedGuids := conf.GetDeletedMetrics(*r.config)
	if len(deletedGuids) > 0 {
		for i, pc := range conf.Partitions {
			pc.RemoveMissingMetrics(deletedGuids)
			conf.Partitions[i] = pc
		}
		for _, v := range deletedGuids {
			r.config.RadarChartMetrics = utils.Remove(r.config.RadarChartMetrics, v)
		}
	}

	// Actually overwrite config
	r.config.Metrics = conf.Metrics
	r.config.Partitions = conf.Partitions
	r.config.MetricCategories = conf.MetricCategories

	// Re-init affected units
	// DB because of potential changes to metrics
	(*r.config).Flush()
	(*r.db).Init(*r.config)
	data, err := json.Marshal(r.config)
	if err != nil {
		logging.Error("Router: UpdateConfig(): Could not unmarshal updated config: ", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Write(data)
}

func (r *Router) LiveLog(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {
	c, err := r.upgrader.Upgrade(w, req, nil)
	if err != nil {
		logging.Error("Router: LiveLog(): error upgrading connection:", err)
		return
	}
	r.logger.AddConnection(c)

	go func() {
		for {
			t, _, _ := c.ReadMessage()
			if t == -1 {
				r.logger.RemoveConnection(c)
				c.Close()
				return
			}
		}
	}()
}

func (r *Router) RefreshMetadata(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	user auth.UserInfo) {
	strId := params.ByName("id")

	id, err := strconv.Atoi(strId)
	if err != nil {
		logging.Error("Router: RefreshMetadata(): Could not convert '", strId, "' to job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Get job metadata from store
	j, err := r.store.GetJob(id)
	if err != nil {
		logging.Error("Router: RefreshMetadata(): Could not get meta data for job ", id, ": ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	data, err := (*r.db).GetJobMetadataMetrics(&j)
	if err != nil {
		logging.Error("Router: RefreshMetadata(): Could not get meta data metrics for job", id, ": ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	j.Data = data
	err = r.store.UpdateJob(j)
	if err != nil {
		logging.Error("Router: RefreshMetadata(): Could not update job ", id, "in store: ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	jsonData, err := json.Marshal(&j)
	if err != nil {
		logging.Error("Router: RefreshMetadata(): Could not marhsal metadata for job ", id, ": ", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(jsonData)
}

func (r *Router) GetUserConfig(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	_ auth.UserInfo) {
	userStr := params.ByName("user")
	if userStr == "" {
		logging.Error("Router: GetUserConfig(): Could not get user string from request params")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	// Restrict available configuration parameters for now
	user, ok := r.store.GetUserRoles(userStr)

	if !ok {
		logging.Error("Router: GetUserConfig(): Could not get roles for user ", userStr)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	data, err := json.Marshal(user)
	if err != nil {
		logging.Error("Router: GetUserConfig(): Could not marshal user ", userStr)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(data)
}

func (r *Router) SetUserConfig(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params,
	_ auth.UserInfo) {
	userStr := params.ByName("user")
	if userStr == "" {
		logging.Error("Router: SetUserConfig(): Could not get user string from request params")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	body, err := io.ReadAll(req.Body)
	if err != nil {
		logging.Error("Router: SetUserConfig(): Could not read request body for user ", userStr, ": ", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Test if it is json user struct
	user := jobstore.UserRoles{}
	err = json.Unmarshal(body, &user)
	if err != nil {
		logging.Error("Router: SetUserConfig(): Could not unmarshal newly set user config for user ", userStr, ": ", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	r.store.SetUserRoles(user.Username, user.Roles)
	data, err := json.Marshal(user)
	if err != nil {
		logging.Error("Router: SetUserConfig(): Could not marshal user ", userStr)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(data)
}

// parseTag reads
// * job ID from http request parameter job
// * a tag from the http body
// * job metadata from the PostgreSQL database
func (r *Router) parseTag(
	w http.ResponseWriter,
	req *http.Request,
) (
	job job.JobMetadata,
	tag job.JobTag,
	ok bool,
) {

	jobStr := req.URL.Query().Get("job")

	jobId, err := strconv.Atoi(jobStr)
	if err != nil {
		logging.Error("Router: parseTag(): Could not convert '", jobStr, "' to job id")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		logging.Error("Router: parseTag(): Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	err = json.Unmarshal(body, &tag)
	if err != nil {
		logging.Error("Router: parseTag(): Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	job, err = r.store.GetJob(jobId)
	if err != nil {
		logging.Error("Router: parseTag(): Could not get job ", jobId, " meta data")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	ok = true
	return
}

func (r *Router) parseGetJobParams(params url.Values) (filter job.JobFilter) {
	parseRangeFilter := func(str string) (rf *job.RangeFilter) {
		parts := strings.Split(str, ",")
		if len(parts) != 2 {
			return nil
		}
		rf = &job.RangeFilter{}
		if p0, err := strconv.Atoi(parts[0]); err == nil {
			rf.From = &p0
		}
		if p1, err := strconv.Atoi(parts[1]); err == nil {
			rf.To = &p1
		}
		return
	}
	if str := params.Get("UserId"); str != "" {
		i, err := strconv.Atoi(str)
		if err != nil {
			filter.UserId = &i
		}
	}
	if str := params.Get("UserName"); str != "" {
		filter.UserName = &str
	}
	if str := params.Get("GroupId"); str != "" {
		i, err := strconv.Atoi(str)
		if err != nil {
			filter.GroupId = &i
		}
	}
	if str := params.Get("GroupName"); str != "" {
		filter.GroupName = &str
	}
	if str := params.Get("IsRunning"); str != "" {
		if str == "true" {
			v := true
			filter.IsRunning = &v
		}
		if str == "false" {
			v := false
			filter.IsRunning = &v
		}
	}
	if str := params.Get("Partition"); str != "" {
		filter.Partition = &str
	}

	if str := params.Get("NumNodes"); str != "" {
		filter.NumNodes = parseRangeFilter(str)
	}
	if str := params.Get("NumTasks"); str != "" {
		filter.NumTasks = parseRangeFilter(str)
	}
	if str := params.Get("NumGpus"); str != "" {
		filter.NumGpus = parseRangeFilter(str)
	}
	if str := params.Get("Time"); str != "" {
		filter.Time = parseRangeFilter(str)
	}
	if str := params.Get("Tags"); str != "" {
		tags := strings.Split(str, ",")
		tagIds := make([]job.JobTag, 0)
		for _, v := range tags {
			i, err := strconv.Atoi(v)
			if err == nil {
				tagIds = append(tagIds, job.JobTag{Id: int64(i)})
			}
		}
		filter.Tags = &tagIds
	}
	return filter
}

// Sends a notification to the administrators
func (r *Router) NotifyAdmin(
	w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params) {

	logging.Info("Request Notification to admins")

	body, err := io.ReadAll(req.Body)
	if err != nil {
		logging.Error("Router: NotifyAdmin(): Could not read http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	var dat auth.UserInfo
	err = json.Unmarshal(body, &dat)
	if err != nil {
		logging.Error("Router: NotifyAdmin(): Could not unmarshal http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if dat.Username == "" {
		logging.Error("Router: NotifyAdmin(): Could not read data from http request body")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if utils.Contains(dat.Roles, "user") || utils.Contains(dat.Roles, "admin") {
		logging.Error("Router: NotifyAdmin(): User already has roles")
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	subject := "Role request by " + dat.Username
	message := "The user " + dat.Username + " tried to access the jobmon-system. " +
		"Currently this user has no role allwoing to access the webinterface." +
		"\n\n" + dat.Username + " requests a Role to access the webinterface."

	if (*r.notifier).Notify(subject, message) != nil {
		w.WriteHeader(http.StatusInternalServerError)
	} else {
		w.WriteHeader(http.StatusOK)
	}
}

// Ping function sending back the current time
func (r *Router) ping(w http.ResponseWriter,
	req *http.Request,
	params httprouter.Params) {

	now := time.Now()

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(now.Format("2006-01-02 15:04:05")))
}
