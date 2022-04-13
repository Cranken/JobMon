package store

import (
	"context"
	"crypto/tls"
	"database/sql"
	"jobmon/config"
	"jobmon/db"
	"jobmon/job"
	"log"
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
	psqldb := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithNetwork("tcp"),
		pgdriver.WithAddr(c.JobStore.PSQLHost),
		pgdriver.WithTLSConfig(&tls.Config{InsecureSkipVerify: true}),
		pgdriver.WithInsecure(true),
		pgdriver.WithUser(c.JobStore.PSQLUsername),
		pgdriver.WithPassword(c.JobStore.PSQLPassword),
		pgdriver.WithDatabase(c.JobStore.PSQLDB),
		pgdriver.WithApplicationName("jobmon-backend")))
	s.db = bun.NewDB(psqldb, pgdialect.New())
	s.db.NewCreateTable().Model((*job.JobMetadata)(nil)).Exec(context.Background())
	s.db.NewCreateTable().Model((*UserSession)(nil)).Exec(context.Background())
	go func() {
		s.removeExpiredJobs()
		s.finishOvertimeJobs()
	}()
}

func (s *PostgresStore) Migrate(source *Store) {
	err := s.db.ResetModel(context.Background(), (*job.JobMetadata)(nil))
	if err != nil {
		log.Printf("[Migration] Err resetting: %v", err)
		return
	}
	jobs, _ := (*source).GetAllJobs()
	res, err := s.db.NewInsert().Model(&jobs).Exec(context.Background())
	if err != nil {
		log.Printf("[Migration] Err inserting: %v", err)
		return
	}
	rows, _ := res.RowsAffected()
	log.Printf("[Migration] Migrated: %v rows", rows)
}

func (s *PostgresStore) PutJob(job job.JobMetadata) error {
	if job.TTL == 0 {
		job.TTL = s.config.DefaultTTL
	}
	_, err := s.db.NewInsert().Model(&job).Exec(context.Background())
	return err
}

func (s *PostgresStore) GetJob(id int) (job job.JobMetadata, err error) {
	job.Id = id
	err = s.db.NewSelect().Model(&job).WherePK().Scan(context.Background())
	return job, err
}

func (s *PostgresStore) GetAllJobs() (jobs []job.JobMetadata, err error) {
	err = s.db.NewSelect().Model(&jobs).Scan(context.Background())
	return jobs, err
}

func (s *PostgresStore) StopJob(id int, stopJob job.StopJob) error {
	job := job.JobMetadata{}
	job.Id = id
	job.IsRunning = false
	job.StopTime = stopJob.StopTime
	job.ExitCode = stopJob.ExitCode
	data, err := (*s.influx).GetJobMetadataMetrics(&job)
	if err != nil {
		return err
	}
	job.Data = data
	return s.UpdateJob(job)
}

func (s *PostgresStore) GetUserSessionToken(username string) (string, bool) {
	user := UserSession{Username: username}
	err := s.db.NewSelect().Model(&user).WherePK().Scan(context.Background())
	if err != nil {
		return "", false
	}
	return user.Token, true
}

func (s *PostgresStore) SetUserSessionToken(username string, token string) {
	user := UserSession{Username: username, Token: token}
	s.db.NewInsert().
		Model(&user).
		On("CONFLICT (username) DO UPDATE").
		Exec(context.Background())
}

func (s *PostgresStore) RemoveUserSessionToken(username string) {
	user := UserSession{Username: username}
	s.db.NewDelete().Model(&user).WherePK().Exec(context.Background())
}

func (s *PostgresStore) Flush() {
	s.db.Close()
}

func (s *PostgresStore) UpdateJob(job job.JobMetadata) error {
	_, err := s.db.NewUpdate().Model(&job).WherePK().Exec(context.Background())
	return err
}

func (s *PostgresStore) AddTag(id int, tag job.JobTag) error {
	job, err := s.GetJob(id)
	if err != nil {
		return err
	}
	job.AddTag(tag)
	return s.UpdateJob(job)
}

func (s *PostgresStore) RemoveTag(id int, tag job.JobTag) error {
	job, err := s.GetJob(id)
	if err != nil {
		return err
	}
	job.RemoveTag(tag)
	return s.UpdateJob(job)
}

func (s *PostgresStore) removeExpiredJobs() {
	now := int(time.Now().Unix())
	deadline := now - s.config.DefaultTTL
	s.db.NewDelete().Model((*job.JobMetadata)(nil)).Where("is_running=false").Where("ttl!=0").Where("stop_time<?", deadline).Exec(context.Background())
}

func (s *PostgresStore) finishOvertimeJobs() {
	now := int(time.Now().Unix())
	for k, pc := range s.config.Partitions {
		deadline := now - pc.MaxTime
		var jobs []job.JobMetadata
		err := s.db.NewSelect().Model(&jobs).Where("is_running=true").Where("partition=?", k).Where("start_time<?", deadline).Scan(context.Background())
		if err == nil && len(jobs) > 0 {
			for _, j := range jobs {
				s.StopJob(j.Id, job.StopJob{StopTime: j.StartTime + pc.MaxTime, ExitCode: 1})
			}
		}
	}
}
