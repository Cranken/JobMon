package store

import (
	"context"
	"crypto/tls"
	"database/sql"
	"fmt"
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
	"jobmon/logging"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/extra/bundebug"
)

type PostgresStore struct {
	influx *db.DB
	config config.Configuration
	db     *bun.DB
}

// Init implements Init method of Store interface.
func (s *PostgresStore) Init(c config.Configuration, influx *db.DB) {
	s.config = c
	s.influx = influx
	psqldb :=
		sql.OpenDB(
			pgdriver.NewConnector(
				pgdriver.WithNetwork("tcp"),
				pgdriver.WithAddr(c.JobStore.PSQLHost),
				pgdriver.WithTLSConfig(&tls.Config{InsecureSkipVerify: true}),
				pgdriver.WithInsecure(true),
				pgdriver.WithUser(c.JobStore.PSQLUsername),
				pgdriver.WithPassword(c.JobStore.PSQLPassword),
				pgdriver.WithDatabase(c.JobStore.PSQLDB),
				pgdriver.WithApplicationName("jobmon-backend"),
			),
		)
	s.db = bun.NewDB(psqldb, pgdialect.New())

	// Verify connection to database
	err := s.db.Ping()
	if err != nil {
		logging.Fatal("store: Init(): Could not connect to PostgreSQL store: ", err)
	}

	// Allow SQL statement debugging
	s.db.AddQueryHook(bundebug.NewQueryHook(
		bundebug.WithVerbose(false),
		bundebug.FromEnv("BUNDEBUG"),
	))

	s.db.RegisterModel((*job.JobToTags)(nil))

	// Table job_to_tags
	_, err =
		s.db.NewCreateTable().
			Model((*job.JobToTags)(nil)).
			IfNotExists().
			Exec(context.Background())
	if err != nil {
		logging.Error("store: Init(): Failed to create table job_to_tags: ", err)
	}

	// Table job_tags
	_, err =
		s.db.NewCreateTable().
			Model((*job.JobTag)(nil)).
			IfNotExists().
			Exec(context.Background())
	if err != nil {
		logging.Error("store: Init(): Failed to create table job_tags: ", err)
	}

	// Table job_metadata
	_, err =
		s.db.NewCreateTable().
			Model((*job.JobMetadata)(nil)).
			IfNotExists().
			Exec(context.Background())
	if err != nil {
		logging.Error("store: Init(): Failed to create table job_metadata: ", err)
	}

	// Table user_sessions
	_, err =
		s.db.NewCreateTable().
			Model((*UserSession)(nil)).
			IfNotExists().
			Exec(context.Background())
	if err != nil {
		logging.Error("store: Init(): Failed to create table user_sessions: ", err)
	}

	// Table user_roles
	_, err =
		s.db.NewCreateTable().
			Model((*UserRoles)(nil)).
			IfNotExists().
			Exec(context.Background())
	if err != nil {
		logging.Error("store: Init(): Failed to create table user_roles: ", err)
	}

	go s.finishOvertimeJobs()
	go s.startCleanJobsTimer()
}

func (s *PostgresStore) Migrate(source *Store) {
	start := time.Now()

	err := s.db.ResetModel(context.Background(), (*job.JobMetadata)(nil))
	if err != nil {
		logging.Error("store: Migration(): Err resetting: ", err)
		return
	}
	jobs, _ := (*source).GetAllJobs()
	res, err :=
		s.db.NewInsert().
			Model(&jobs).
			Exec(context.Background())
	if err != nil {
		logging.Error("store: Migration(): Err inserting: ", err)
		return
	}
	rows, _ := res.RowsAffected()

	logging.Info("store: Migration(): took ", time.Since(start))
	logging.Info("store: Migration(): Migrated: ", rows, " rows")
}

// PutJob implements PutJob method of store interface.
func (s *PostgresStore) PutJob(job job.JobMetadata) error {
	start := time.Now()

	_, err :=
		s.db.NewInsert().
			Model(&job).
			Exec(context.Background())
	if err != nil {
		return err
	}

	logging.Info("store: PutJob (job ID = ", job.Id, ") took ", time.Since(start))
	return nil
}

// GetJob implements GetJob method of store interface.
func (s *PostgresStore) GetJob(id int) (job job.JobMetadata, err error) {
	start := time.Now()

	job.Id = id
	err =
		s.db.NewSelect().
			Model(&job).
			WherePK().
			Relation("Tags").
			Scan(context.Background())
	if err != nil {
		return
	}

	logging.Info("store: GetJob (job ID = ", job.Id, ") took ", time.Since(start))
	return
}

// GetAllJobs implements GetAllJobs of store interface.
func (s *PostgresStore) GetAllJobs() (jobs []job.JobMetadata, err error) {
	start := time.Now()

	err =
		s.db.NewSelect().
			Model(&jobs).
			Scan(context.Background())
	if err != nil {
		jobs = []job.JobMetadata{}
		return
	}

	logging.Info("store: GetAllJob took ", time.Since(start))
	return
}

// GetFilteredJobs implements GetFilteredJobs of store interface.
func (s *PostgresStore) GetFilteredJobs(
	filter job.JobFilter,
) (
	jobs []job.JobMetadata,
	err error,
) {
	start := time.Now()

	query := s.db.NewSelect().Model(&jobs).Relation("Tags")
	query = appendTagFilter(query, filter.Tags, s.db)
	query = appendValueFilter(query, filter.UserId, "user_id")
	query = appendValueFilter(query, filter.UserName, "user_name")
	query = appendValueFilter(query, filter.GroupId, "group_id")
	query = appendValueFilter(query, filter.GroupName, "group_name")
	query = appendValueFilter(query, filter.IsRunning, "is_running")
	query = appendValueFilter(query, filter.Partition, "partition")
	query = appendRangeFilter(query, filter.NumNodes, "num_nodes")
	query = appendRangeFilter(query, filter.NumTasks, "num_tasks")
	query = appendRangeFilter(query, filter.NumGpus, "num_nodes * job_metadata.gp_us_per_node")
	query = appendRangeFilter(query, filter.Time, "start_time")
	err = query.Scan(context.Background())
	if err != nil {
		jobs = []job.JobMetadata{}
		return
	}

	logging.Info("store: GetFilteredJobs took ", time.Since(start))
	return
}

// GetJobTags implements GetJobTags of store interface.
func (s *PostgresStore) GetJobTags(
	username string,
) (
	tags []job.JobTag,
	err error,
) {
	start := time.Now()

	query := s.db.NewSelect().
		Table("job_tags").
		ColumnExpr("job_tags.*").
		Join("INNER JOIN job_to_tags ON job_tags.id=job_to_tags.tag_id").
		Join("INNER JOIN job_metadata ON job_metadata.id=job_to_tags.job_id")
	if username != "" {
		query = query.Where("job_metadata.user_name=?", username)
	}
	err = query.Scan(context.Background(), &tags)
	if err != nil {
		tags = []job.JobTag{}
		return
	}

	logging.Info("store: GetJobTags took ", time.Since(start))
	return
}

// StopJob implements StopJob method of store interface.
func (s *PostgresStore) StopJob(
	id int,
	stopJob job.StopJob,
) (
	err error,
) {
	start := time.Now()

	// Get job metadata from the database
	job, err := s.GetJob(id)
	if err != nil {
		return
	}

	// Add job metadata information
	job.IsRunning = false
	job.StopTime = stopJob.StopTime
	job.ExitCode = stopJob.ExitCode
	data, err := (*s.influx).GetJobMetadataMetrics(&job)
	if err != nil {
		return
	}
	job.Data = data

	err = s.UpdateJob(job)
	if err != nil {
		return
	}

	logging.Info("store: StopJob took ", time.Since(start))
	return
}

// GetUserSessionToken implements GetUserSessionToken method of store interface.
func (s *PostgresStore) GetUserSessionToken(
	username string,
) (
	token string,
	ok bool,
) {
	start := time.Now()

	user := UserSession{Username: username}
	err := s.db.NewSelect().
		Model(&user).
		WherePK().
		Scan(context.Background())
	if err != nil {
		return
	}

	logging.Info("store: GetUserSessionToken took ", time.Since(start))
	token = user.Token
	ok = true
	return
}

// SetUserSessionToken implements SetUserSessionToken method of store interface.
func (s *PostgresStore) SetUserSessionToken(
	username string,
	token string,
) {
	start := time.Now()

	user :=
		UserSession{
			Username: username,
			Token:    token,
		}
	_, err := s.db.NewInsert().
		Model(&user).
		On("CONFLICT (username) DO UPDATE").
		Exec(context.Background())
	if err != nil {
		logging.Error("store: SetUserSessionToken(): NewInsert() failed: ", err)
		return
	}

	logging.Info("store: SetUserSessionToken took ", time.Since(start))
}

// RemoveUserSession implements RemoveUserSession method of store interface.
func (s *PostgresStore) RemoveUserSession(username string) {
	start := time.Now()

	_, err := s.db.NewDelete().
		Model(&UserSession{Username: username}).
		WherePK().
		Exec(context.Background())
	if err != nil {
		logging.Error("store: RemoveUserSession(): NewDelete() for user '", username, "' failed: ", err)
		return
	}

	logging.Info("store: RemoveUserSession(): removed user session for user '", username, "'")
	logging.Info("store: RemoveUserSession took ", time.Since(start))
}

// GetUserRoles implements GetUserRoles method of store interface.
func (s *PostgresStore) GetUserRoles(
	username string,
) (
	userRoles UserRoles,
	ok bool,
) {
	start := time.Now()

	userRoles.Username = username
	err :=
		s.db.NewSelect().
			Model(&userRoles).
			WherePK().
			Scan(context.Background())
	if err != nil {
		logging.Error("store: GetUserRoles: Failed to get user role for user '", username, "': ", err)
		userRoles = UserRoles{
			Username: username,
			Roles:    []string{},
		}
		ok = false
		return
	}

	logging.Info("store: GetUserRoles took ", time.Since(start))
	ok = true
	return
}

// SetUserRoles implements SetUserRoles method of store interface.
func (s *PostgresStore) SetUserRoles(
	username string,
	roles []string,
) {
	start := time.Now()

	user :=
		UserRoles{
			Username: username,
			Roles:    roles,
		}
	_, err :=
		s.db.NewInsert().
			Model(&user).
			On("CONFLICT (username) DO UPDATE").
			Exec(context.Background())
	if err != nil {
		logging.Error("store: SetUserRoles(): Failed to set roles, ", roles, " for user ", username, ": ", err)
		return
	}

	logging.Info("store: SetUserRoles took ", time.Since(start))
}

// Flush implements Flush method of store interface.
func (s *PostgresStore) Flush() {
	err := s.db.Close()
	if err != nil {
		logging.Error("store: Flush(): failed to close database")
	}
}

// UpdateJob implements UpdateJob method of store interface.
func (s *PostgresStore) UpdateJob(job job.JobMetadata) error {
	start := time.Now()

	_, err :=
		s.db.NewUpdate().
			Model(&job).
			WherePK().
			Exec(context.Background())
	if err != nil {
		return err
	}

	logging.Info("store: UpdateJob took ", time.Since(start))
	return nil
}

// AddTag implements AddTag method of store interface.
func (s *PostgresStore) AddTag(id int, tag *job.JobTag) error {
	start := time.Now()

	// Create tag in database
	_, err :=
		s.db.NewInsert().
			Model(tag).
			Exec(context.Background())
	if err != nil {
		return err
	}

	// Mark job with tag
	j2t :=
		job.JobToTags{
			JobId: id,
			TagId: tag.Id,
		}
	_, err =
		s.db.NewInsert().
			Model(&j2t).
			Exec(context.Background())
	if err != nil {
		return err
	}

	logging.Info("store: AddTag took ", time.Since(start))
	return nil
}

// RemoveTag implements RemoveTag method of store interface.
func (s *PostgresStore) RemoveTag(id int, tag *job.JobTag) error {
	start := time.Now()

	j2t :=
		job.JobToTags{
			JobId: id,
			TagId: tag.Id,
		}
	_, err :=
		s.db.NewDelete().
			Model(&j2t).
			WherePK().
			Exec(context.Background())
	if err != nil {
		return err
	}

	logging.Info("store: RemoveTag took ", time.Since(start))
	return nil
}

// finishOvertimeJobs changes running jobs that have exceeded MaxTime to finished jobs.
func (s *PostgresStore) finishOvertimeJobs() {
	start := time.Now()

	now := int(time.Now().Unix())
	for k, pc := range s.config.Partitions {
		deadline := now - pc.MaxTime
		var jobs []job.JobMetadata
		err :=
			s.db.NewSelect().
				Model(&jobs).
				Where("is_running=true").
				Where("partition=?", k).
				Where("start_time<?", deadline).
				Scan(context.Background())
		if err == nil && len(jobs) > 0 {
			for _, j := range jobs {
				s.StopJob(
					j.Id,
					job.StopJob{
						StopTime: j.StartTime + pc.MaxTime,
						ExitCode: 1,
					},
				)
			}
		}
	}

	logging.Info("store: finishOvertimeJobs took ", time.Since(start))
}

// startCleanJobsTimer start a timer to finish over time jobs every 12 hours
func (s *PostgresStore) startCleanJobsTimer() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C
		s.finishOvertimeJobs()
	}
}

// appendValueFilter appends filter values val with key to the query.
func appendValueFilter[V int | string | bool](query *bun.SelectQuery, val *V, key string) *bun.SelectQuery {
	if val != nil {
		query = query.Where(fmt.Sprintf("%s=?", key), *val)
	}
	return query
}

// appendRangeFilter appends range filter values val with key to the query.
func appendRangeFilter(query *bun.SelectQuery, val *job.RangeFilter, key string) *bun.SelectQuery {
	if val != nil {
		if val.From != nil {
			query = query.Where(fmt.Sprintf("job_metadata.%s >= ?", key), *val.From)
		}
		if val.To != nil {
			query = query.Where(fmt.Sprintf("job_metadata.%s <= ?", key), *val.To)
		}
	}
	return query
}

// appendTagFilter appends a tag filter to the query.
func appendTagFilter(query *bun.SelectQuery, tags *[]job.JobTag, db *bun.DB) *bun.SelectQuery {
	if tags != nil {
		var tagIds []int64
		for _, jt := range *tags {
			tagIds = append(tagIds, jt.Id)
		}
		subq := db.NewSelect().
			Model((*job.JobMetadata)(nil)).
			Join("INNER JOIN job_to_tags ON job_to_tags.job_id = job_metadata.id").
			Join("INNER JOIN job_tags ON job_tags.id = job_to_tags.tag_id").
			Where("job_tags.id IN (?)", bun.In(tagIds)).
			Group("job_metadata.id").
			Having("COUNT(DISTINCT job_tags.id) = ?", len(tagIds))
			// Workaround; use subquery as "main" query
		query.ModelTableExpr("").TableExpr("(?) AS job_metadata", subq)
	}
	return query
}
