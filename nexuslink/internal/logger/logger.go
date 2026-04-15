package logger

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"
)

// Logger 日志记录器
type Logger struct {
	mu           sync.Mutex
	level        atomic.Int32 // 0: debug, 1: info, 2: warn, 3: error
	output       io.Writer
	logFile      *os.File
	filePath     string
	buffer       []LogEntry
	bufferMutex  sync.Mutex
	maxBuffer    int
}

// LogEntry 日志条目
type LogEntry struct {
	Time    time.Time `json:"time"`
	Level   string   `json:"level"`
	Message string   `json:"message"`
}

const (
	LogDebug = iota
	LogInfo
	LogWarn
	LogError
)

const (
	bufferSize    = 1000
	logFileName   = "app.log"
	maxFileSize   = 10 * 1024 * 1024 // 10MB
)

// New 创建日志记录器
func New() *Logger {
	logger := &Logger{
		output:     os.Stdout,
		buffer:     make([]LogEntry, 0, bufferSize),
		maxBuffer:  bufferSize,
		level:      atomic.Int32{},
	}
	logger.level.Store(LogInfo)

	// 初始化日志文件
	if err := logger.initLogFile(); err != nil {
		logger.output = os.Stdout
	}

	return logger
}

// SetLevel 设置日志级别
func (l *Logger) SetLevel(level int) {
	l.level.Store(int32(level))
}

// GetLevel 获取日志级别
func (l *Logger) GetLevel() int {
	return int(l.level.Load())
}

// Debug 调试日志
func (l *Logger) Debug(format string, args ...interface{}) {
	if l.level.Load() <= LogDebug {
		l.log("DEBUG", fmt.Sprintf(format, args...))
	}
}

// Info 信息日志
func (l *Logger) Info(format string, args ...interface{}) {
	if l.level.Load() <= LogInfo {
		l.log("INFO", fmt.Sprintf(format, args...))
	}
}

// Warn 警告日志
func (l *Logger) Warn(format string, args ...interface{}) {
	if l.level.Load() <= LogWarn {
		l.log("WARN", fmt.Sprintf(format, args...))
	}
}

// Error 错误日志
func (l *Logger) Error(format string, args ...interface{}) {
	if l.level.Load() <= LogError {
		l.log("ERROR", fmt.Sprintf(format, args...))
	}
}

// log 内部日志方法
func (l *Logger) log(level, message string) {
	entry := LogEntry{
		Time:    time.Now(),
		Level:   level,
		Message: message,
	}

	// 添加到缓冲区
	l.addToBuffer(entry)

	// 输出到控制台
	consoleLine := fmt.Sprintf("[%s] [%s] %s\n",
		entry.Time.Format("2006-01-02 15:04:05"),
		level,
		message,
	)

	if l.output != nil {
		l.mu.Lock()
		l.output.Write([]byte(consoleLine))
		l.mu.Unlock()
	}

	// 写入文件
	if l.logFile != nil {
		l.mu.Lock()
		l.logFile.Write([]byte(consoleLine))
		l.mu.Unlock()
	}
}

// addToBuffer 添加到缓冲区
func (l *Logger) addToBuffer(entry LogEntry) {
	l.bufferMutex.Lock()
	defer l.bufferMutex.Unlock()

	if len(l.buffer) >= l.maxBuffer {
		// 移除一半旧日志
		l.buffer = l.buffer[len(l.buffer)/2:]
	}

	l.buffer = append(l.buffer, entry)
}

// GetEntries 获取日志条目
func (l *Logger) GetEntries(limit int) []LogEntry {
	l.bufferMutex.Lock()
	defer l.bufferMutex.Unlock()

	if len(l.buffer) <= limit {
		result := make([]LogEntry, len(l.buffer))
		copy(result, l.buffer)
		return result
	}

	result := make([]LogEntry, limit)
	copy(result, l.buffer[len(l.buffer)-limit:])
	return result
}

// Clear 清空缓冲区
func (l *Logger) Clear() {
	l.bufferMutex.Lock()
	defer l.bufferMutex.Unlock()
	l.buffer = make([]LogEntry, 0, bufferSize)
}

// SetOutput 设置输出
func (l *Logger) SetOutput(output io.Writer) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.output = output
}

// Close 关闭日志
func (l *Logger) Close() {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.logFile != nil {
		l.logFile.Close()
	}
}

// initLogFile 初始化日志文件
func (l *Logger) initLogFile() error {
	// 获取日志目录
	logDir := getLogDir()
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return err
	}

	l.filePath = filepath.Join(logDir, logFileName)

	// 检查文件是否需要轮转
	if err := l.rotateIfNecessary(); err != nil {
		return err
	}

	// 打开日志文件
	file, err := os.OpenFile(l.filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}

	l.logFile = file
	return nil
}

// rotateIfNecessary 如果需要则轮转日志文件
func (l *Logger) rotateIfNecessary() error {
	info, err := os.Stat(l.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	if info.Size() > maxFileSize {
		// 重命名旧文件
		oldName := l.filePath + "." + time.Now().Format("20060102150405")
		if err := os.Rename(l.filePath, oldName); err != nil {
			return err
		}

		// 保留最新的 5 个备份
		l.cleanupOldLogs()
	}

	return nil
}

// cleanupOldLogs 清理旧日志
func (l *Logger) cleanupOldLogs() {
	entries, err := os.ReadDir(getLogDir())
	if err != nil {
		return
	}

	var oldLogs []os.DirEntry
	for _, entry := range entries {
		if entry.Name() != logFileName && entry.Name()[:len(logFileName)] == logFileName {
			oldLogs = append(oldLogs, entry)
		}
	}

	// 删除最旧的日志
	if len(oldLogs) > 5 {
		// 按时间排序
		for i := len(oldLogs) - 5; i < len(oldLogs); i++ {
			os.Remove(filepath.Join(getLogDir(), oldLogs[i].Name()))
		}
	}
}

// getLogDir 获取日志目录
func getLogDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	logDir := filepath.Join(homeDir, ".nexuslink", "logs")
	return logDir
}

// GetLogDir 获取日志目录（供外部使用）
func GetLogDir() string {
	return getLogDir()
}

// GetLogs 读取日志文件内容
func GetLogs(lines int) ([]string, error) {
	logPath := filepath.Join(getLogDir(), logFileName)
	file, err := os.Open(logPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	defer file.Close()

	// 读取文件内容
	content, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	// 分割为行
	linesSlice := splitLines(string(content))
	if len(linesSlice) <= lines {
		return linesSlice, nil
	}

	return linesSlice[len(linesSlice)-lines:], nil
}

// splitLines 分割行
func splitLines(content string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(content); i++ {
		if content[i] == '\n' {
			lines = append(lines, content[start:i])
			start = i + 1
		}
	}
	if start < len(content) {
		lines = append(lines, content[start:])
	}
	return lines
}
