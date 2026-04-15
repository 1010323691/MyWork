package main

import (
	"context"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:build/frontend-dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// 创建应用选项
	appOptions := &options.App{
		Title:  "NexusLink",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		OnBeforeClose:    app.onBeforeClose,
		Bind: []interface{}{
			app,
		},
	}

	// 根据设置决定点击关闭按钮时是否隐藏窗口
	hideWindowOnClose, err := app.getHideWindowOnCloseSetting()
	if err == nil {
		appOptions.HideWindowOnClose = hideWindowOnClose
	}

	err = wails.Run(appOptions)
	if err != nil {
		println("Error:", err.Error())
	}
}

// onBeforeClose 在窗口关闭前调用
func (a *App) onBeforeClose(ctx context.Context) (prevent bool) {
	// 如果启用了隐藏窗口功能，则阻止关闭并隐藏窗口
	hideWindowOnClose, err := a.getHideWindowOnCloseSetting()
	if err != nil {
		return false // 出错时允许关闭
	}

	if hideWindowOnClose {
		// 隐藏窗口而不是关闭
		runtime.WindowHide(ctx)
		return true // 阻止关闭
	}

	return false // 允许关闭
}

// getHideWindowOnCloseSetting 获取隐藏窗口设置
func (a *App) getHideWindowOnCloseSetting() (bool, error) {
	settings, err := a.storage.GetSettings()
	if err != nil {
		return false, err
	}
	if settings == nil {
		return false, nil
	}
	return settings.MinToTray, nil
}
