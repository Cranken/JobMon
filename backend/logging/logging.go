package logging

import (
	"fmt"
	"io"
	"log"
	"os"
)

const (
	OffLogLevel = iota
	ErrorLogLevel
	WarningLogLevel
	InfoLogLevel
	DebugLogLevel
)

var (
	// Logging level from off to debug
	logLevel int = WarningLogLevel

	// Loggers for various logging levels
	errorLog *log.Logger = log.New(os.Stderr, "ERROR: ", log.LstdFlags)
	warnLog  *log.Logger = log.New(os.Stderr, "WARN: ", log.LstdFlags)
	infoLog  *log.Logger = log.New(os.Stderr, "INFO: ", log.LstdFlags)
	debugLog *log.Logger = log.New(os.Stderr, "DEBUG: ", log.LstdFlags)
)

// Fatal prints fatal error and exits program
func Fatal(e ...interface{}) {
	errorLog.Print(e...)
	os.Exit(1)
}

// Error prints an error logging message when allowed by log level
func Error(e ...interface{}) {
	if logLevel >= ErrorLogLevel {
		errorLog.Print(e...)
	}
}

// Warning prints an warning logging message when allowed by log level
func Warning(e ...interface{}) {
	if logLevel >= WarningLogLevel {
		warnLog.Print(e...)
	}
}

// Warning prints an information logging message when allowed by log level
func Info(e ...interface{}) {
	if logLevel >= InfoLogLevel {
		infoLog.Print(e...)
	}
}

// Debug prints a debug logging message when allowed by log level
func Debug(e ...interface{}) {
	if logLevel >= DebugLogLevel {
		debugLog.Print(e...)
	}
}

// SetLogLevel sets the logging level between off an debugging
func SetLogLevel(l int) error {
	// Check log level is in allowed range
	if l < OffLogLevel || l > DebugLogLevel {
		return fmt.Errorf("log level must be between off = %v and debug = %v", OffLogLevel, DebugLogLevel)
	}

	// Set log level
	logLevel = l
	return nil
}

// SetOutput for all logging functions
func SetOutput(w io.Writer) {
	errorLog.SetOutput(w)
	warnLog.SetOutput(w)
	infoLog.SetOutput(w)
	debugLog.SetOutput(w)
}
