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
)

type PostgresStore struct {
	influx *db.DB
	config config.Configuration
	db     *bun.DB
}

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
	err := s.db.Ping()
	if err != nil {
		logging.Fatal("store: Init(): Could not connect to PostgreSQL store: ", err)
	}
	s.db.RegisterModel((*job.JobToTags)(nil))
	s.db.NewCreateTable().
		Model((*job.JobToTags)(nil)).
		Exec(context.Background())
	s.db.NewCreateTable().
		Model((*job.JobTag)(nil)).
		Exec(context.Background())
	s.db.NewCreateTable().
		Model((*job.JobMetadata)(nil)).
		Exec(context.Background())
	s.db.NewCreateTable().
		Model((*UserSession)(nil)).
		Exec(context.Background())
	s.db.NewCreateTable().
		Model((*UserRoles)(nil)).
		Exec(context.Background())
	go func() {
		s.finishOvertimeJobs()
	}()
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
	res, err := s.db.NewInsert().Model(&jobs).Exec(context.Background())
	if err != nil {
		logging.Error("store: Migration(): Err inserting: ", err)
		return
	}
	rows, _ := res.RowsAffected()

	logging.Info("store: Migration(): took ", time.Since(start))
	logging.Info("store: Migration(): Migrated: ", rows, " rows")
}

func (s *PostgresStore) PutJob(job job.JobMetadata) error {
	start := time.Now()

	_, err :=
		s.db.NewInsert().
			Model(&job).
			Exec(context.Background())

	logging.Info("store: PutJob (job ID = ", job.Id, ") took ", time.Since(start))
	return err
}

func (s *PostgresStore) GetJob(id int) (job job.JobMetadata, err error) {
	start := time.Now()

	job.Id = id
	err =
		s.db.NewSelect().
			Model(&job).
			WherePK().
			Relation("Tags").
			Scan(context.Background())

	logging.Info("store: GetJob (job ID = ", job.Id, ") took ", time.Since(start))
	return job, err
}

func (s *PostgresStore) GetAllJobs() (jobs []job.JobMetadata, err error) {
	start := time.Now()

	err =
		s.db.NewSelect().
			Model(&jobs).
			Scan(context.Background())

	logging.Info("store: GetAllJob took ", time.Since(start))
	return jobs, err
}

func (s *PostgresStore) GetFilteredJobs(filter job.JobFilter) (jobs []job.JobMetadata, err error) {
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

	logging.Info("store: GetFilteredJobs took ", time.Since(start))
	return
}

func (s *PostgresStore) GetJobTags(username string) (tags []job.JobTag, err error) {
	start := time.Now()

	query := s.db.NewSelect().Table("job_tags").ColumnExpr("job_tags.*").
		Join("INNER JOIN job_to_tags ON job_tags.id=job_to_tags.tag_id").
		Join("INNER JOIN job_metadata ON job_metadata.id=job_to_tags.job_id")
	if username != "" {
		query = query.Where("job_metadata.user_name=?", username)
	}
	err = query.Scan(context.Background(), &tags)

	logging.Info("store: GetJobTags took ", time.Since(start))
	return
}

func (s *PostgresStore) StopJob(id int, stopJob job.StopJob) error {
	start := time.Now()

	job, err := s.GetJob(id)
	if err != nil {
		return err
	}
	job.IsRunning = false
	job.StopTime = stopJob.StopTime
	job.ExitCode = stopJob.ExitCode
	data, err := (*s.influx).GetJobMetadataMetrics(&job)
	if err != nil {
		return err
	}
	job.Data = data

	logging.Info("store: StopJob took ", time.Since(start))
	return s.UpdateJob(job)
}

func (s *PostgresStore) GetUserSessionToken(username string) (string, bool) {
	start := time.Now()

	user := UserSession{Username: username}
	err := s.db.NewSelect().Model(&user).WherePK().Scan(context.Background())
	if err != nil {
		return "", false
	}

	logging.Info("store: GetUserSessionToken took ", time.Since(start))
	return user.Token, true
}

func (s *PostgresStore) SetUserSessionToken(username string, token string) {
	start := time.Now()

	user :=
		UserSession{
			Username: username,
			Token:    token,
		}
	s.db.NewInsert().
		Model(&user).
		On("CONFLICT (username) DO UPDATE").
		Exec(context.Background())

	logging.Info("store: SetUserSessionToken took ", time.Since(start))
}

func (s *PostgresStore) RemoveUserSessionToken(username string) {
	start := time.Now()

	user := UserSession{Username: username}
	s.db.NewDelete().
		Model(&user).
		WherePK().
		Exec(context.Background())

	logging.Info("store: RemoveUserSessionToken took ", time.Since(start))
}

func (s *PostgresStore) GetUserRoles(username string) (UserRoles, bool) {
	start := time.Now()

	user := UserRoles{Username: username}
	err :=
		s.db.NewSelect().
			Model(&user).
			WherePK().
			Scan(context.Background())
	if err != nil {
		return user, false
	}

	logging.Info("store: GetUserRoles took ", time.Since(start))
	return user, true
}

func (s *PostgresStore) SetUserRoles(username string, roles []string) {
	start := time.Now()

	user :=
		UserRoles{
			Username: username,
			Roles:    roles,
		}
	s.db.NewInsert().
		Model(&user).
		On("CONFLICT (username) DO UPDATE").
		Exec(context.Background())

	logging.Info("store: SetUserRoles took ", time.Since(start))
}

func (s *PostgresStore) Flush() {
	s.db.Close()
}

func (s *PostgresStore) UpdateJob(job job.JobMetadata) error {
	start := time.Now()

	_, err :=
		s.db.NewUpdate().
			Model(&job).
			WherePK().
			Exec(context.Background())

	logging.Info("store: UpdateJob took ", time.Since(start))
	return err
}

func (s *PostgresStore) AddTag(id int, tag *job.JobTag) error {
	start := time.Now()

	_, err :=
		s.db.NewInsert().
			Model(tag).
			Exec(context.Background())
	if err != nil {
		return err
	}
	j2t :=
		job.JobToTags{
			JobId: id,
			TagId: tag.Id,
		}
	_, err =
		s.db.NewInsert().
			Model(&j2t).
			Exec(context.Background())

	logging.Info("store: AddTag took ", time.Since(start))
	return err
}

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

	logging.Info("store: RemoveTag took ", time.Since(start))
	return err
}

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

func (s *PostgresStore) startCleanJobsTimer() {
	ticker := time.NewTicker(12 * time.Hour)
	for {
		<-ticker.C
		s.finishOvertimeJobs()
	}
}

func appendValueFilter[V int | string | bool](query *bun.SelectQuery, val *V, key string) *bun.SelectQuery {
	if val != nil {
		query = query.Where(fmt.Sprintf("%s=?", key), *val)
	}
	return query
}

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

func appendTagFilter(query *bun.SelectQuery, tags *[]job.JobTag, db *bun.DB) *bun.SelectQuery {
	if tags != nil {
		var tagIds []int64
		for _, jt := range *tags {
			tagIds = append(tagIds, jt.Id)
		}
		subq := db.NewSelect().Model((*job.JobMetadata)(nil)).
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
