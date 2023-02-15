package logging

import (
	"log"
	"os"
)

const (
	error = iota
	warning
	info
	debug
)

var (
	logLevel int         = debug
	errorLog *log.Logger = log.New(os.Stderr, "ERROR ", log.LstdFlags)
	warnLog  *log.Logger = log.New(os.Stderr, "WARN ", log.LstdFlags)
	infoLog  *log.Logger = log.New(os.Stdout, "INFO ", log.LstdFlags)
	debugLog *log.Logger = log.New(os.Stderr, "DEBUG ", log.LstdFlags)
)

func Error(e ...interface{}) {
	if logLevel >= debug {
		errorLog.Print(e...)
	}
}

func Warning(e ...interface{}) {
	if logLevel >= warning {
		warnLog.Print(e...)
	}
}

func Info(e ...interface{}) {
	if logLevel >= info {
		infoLog.Print(e...)
	}
}

func Debug(e ...interface{}) {
	if logLevel >= debug {
		debugLog.Print(e...)
	}
}
