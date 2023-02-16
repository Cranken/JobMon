package logging

import (
	"fmt"
	"log"
	"os"
)

const (
	offLevel = iota
	errorLevel
	warningLevel
	infoLevel
	debugLevel
)

var (
	// Logging level from off to debug
	logLevel int = debugLevel

	// Loggers for various logging levels
	errorLog *log.Logger = log.New(os.Stderr, "ERROR: ", log.LstdFlags)
	warnLog  *log.Logger = log.New(os.Stderr, "WARN: ", log.LstdFlags)
	infoLog  *log.Logger = log.New(os.Stdout, "INFO: ", log.LstdFlags)
	debugLog *log.Logger = log.New(os.Stderr, "DEBUG: ", log.LstdFlags)
)

// Error prints an error logging message when allowed by log level
func Error(e ...interface{}) {
	if logLevel >= errorLevel {
		errorLog.Print(e...)
	}
}

// Warning prints an warning logging message when allowed by log level
func Warning(e ...interface{}) {
	if logLevel >= warningLevel {
		warnLog.Print(e...)
	}
}

// Warning prints an information logging message when allowed by log level
func Info(e ...interface{}) {
	if logLevel >= infoLevel {
		infoLog.Print(e...)
	}
}

// Debug prints a debug logging message when allowed by log level
func Debug(e ...interface{}) {
	if logLevel >= debugLevel {
		debugLog.Print(e...)
	}
}

// SetLogLevel sets the logging level between off an debugging
func SetLogLevel(l int) error {
	// Check log level is in allowed range
	if l < offLevel || l > debugLevel {
		return fmt.Errorf("log level must be between offLevel = %v and debugLevel = %v", offLevel, debugLevel)
	}

	// Set log level
	logLevel = l
	return nil
}
