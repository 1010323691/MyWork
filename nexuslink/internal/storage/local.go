package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// LocalStorage 本地存储
type LocalStorage struct {
	mu     sync.RWMutex
	dataDir string
}

// StorageData 存储的数据
type StorageData struct {
	Token    string      `json:"token,omitempty"`
	UserInfo *UserInfo   `json:"user_info,omitempty"`
	Config   interface{} `json:"config,omitempty"`
	Settings *Settings   `json:"settings,omitempty"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Settings 应用设置
type Settings struct {
	AutoStart     bool `json:"auto_start"`
	MinToTray     bool `json:"min_to_tray"`
	Theme         string `json:"theme"` // light, dark, auto
	Language      string `json:"language"`
	LastWindowSize [2]int `json:"last_window_size"`
	LastWindowPos  [2]int `json:"last_window_pos"`
}

// NewLocalStorage 创建本地存储
func NewLocalStorage() *LocalStorage {
	ls := &LocalStorage{
		dataDir: getDataDir(),
	}
	ls.ensureDir()
	return ls
}

// SaveToken 保存 Token
func (ls *LocalStorage) SaveToken(token string) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	data, err := ls.load()
	if err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}

	if data == nil {
		data = &StorageData{}
	}
	data.Token = token

	return ls.save(data)
}

// GetToken 获取 Token
func (ls *LocalStorage) GetToken() (string, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	data, err := ls.load()
	if err != nil {
		return "", err
	}

	if data == nil {
		return "", ErrNotFound
	}

	return data.Token, nil
}

// ClearToken 清除 Token
func (ls *LocalStorage) ClearToken() error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	data, err := ls.load()
	if err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}

	if data != nil {
		data.Token = ""
		return ls.save(data)
	}

	return nil
}

// SaveSettings 保存设置
func (ls *LocalStorage) SaveSettings(settings *Settings) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	data, err := ls.load()
	if err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}

	if data == nil {
		data = &StorageData{}
	}
	data.Settings = settings

	return ls.save(data)
}

// GetSettings 获取设置
func (ls *LocalStorage) GetSettings() (*Settings, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	data, err := ls.load()
	if err != nil {
		return nil, err
	}

	if data == nil || data.Settings == nil {
		return &Settings{
			Theme: "auto",
			Language: "zh-CN",
			LastWindowSize: [2]int{1200, 800},
		}, nil
	}

	return data.Settings, nil
}

// SaveConfig 保存配置
func (ls *LocalStorage) SaveConfig(config interface{}) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	data, err := ls.load()
	if err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}

	if data == nil {
		data = &StorageData{}
	}
	data.Config = config

	return ls.save(data)
}

// GetConfig 获取配置
func (ls *LocalStorage) GetConfig() (interface{}, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()

	data, err := ls.load()
	if err != nil {
		return nil, err
	}

	if data == nil {
		return nil, ErrNotFound
	}

	return data.Config, nil
}

// Save 保存完整数据
func (ls *LocalStorage) Save(data *StorageData) error {
	ls.mu.Lock()
	defer ls.mu.Unlock()
	return ls.save(data)
}

// Load 加载完整数据
func (ls *LocalStorage) Load() (*StorageData, error) {
	ls.mu.RLock()
	defer ls.mu.RUnlock()
	return ls.load()
}

// 私有方法
func (ls *LocalStorage) save(data *StorageData) error {
	dataJSON, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(ls.dataDir, "data.json"), dataJSON, 0600)
}

func (ls *LocalStorage) load() (*StorageData, error) {
	data, err := os.ReadFile(filepath.Join(ls.dataDir, "data.json"))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	var storageData StorageData
	if err := json.Unmarshal(data, &storageData); err != nil {
		return nil, err
	}

	return &storageData, nil
}

func (ls *LocalStorage) ensureDir() {
	if err := os.MkdirAll(ls.dataDir, 0755); err != nil {
		ls.dataDir = "."
	}
}

func getDataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "."
	}
	dataDir := filepath.Join(homeDir, ".nexuslink")
	return dataDir
}

// 错误定义
var (
	ErrNotFound = errors.New("数据未找到")
	ErrCorrupted = errors.New("数据已损坏")
)
