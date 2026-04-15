<template>
  <div class="min-h-screen bg-stone-50">
    <!-- 顶部导航 -->
    <nav class="border-b border-stone-200 sticky top-0 z-50 bg-stone-50/80 backdrop-blur">
      <div class="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="inline-flex w-8 h-8 items-center justify-center rounded bg-stone-900 text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-medium text-stone-900">设置</h1>
            <p class="text-xs text-stone-500">管理应用程序配置</p>
          </div>
        </div>
        <button @click="goBack" class="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors rounded hover:bg-stone-100 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </button>
      </div>
    </nav>

    <!-- 主内容区 -->
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <!-- 启动设置 -->
      <div class="card">
        <h2 class="text-sm font-medium text-white mb-4">启动设置</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer group py-2">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span class="text-sm text-stone-500 group-hover:text-stone-700">开机自启</span>
            </div>
            <div class="relative">
              <input
                type="checkbox"
                v-model="settings.autoStart"
                class="w-4 h-4 rounded border-stone-300 bg-white text-amber-600 focus:ring-amber-600 focus:ring-offset-0"
              />
            </div>
          </label>

          <label class="flex items-center justify-between cursor-pointer group py-2">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 12H4" />
              </svg>
              <span class="text-sm text-stone-500 group-hover:text-stone-700">最小化到托盘</span>
            </div>
            <div class="relative">
              <input
                type="checkbox"
                v-model="settings.minToTray"
                class="w-4 h-4 rounded border-stone-300 bg-white text-amber-600 focus:ring-amber-600 focus:ring-offset-0"
              />
            </div>
          </label>
        </div>
      </div>

      <!-- 外观设置 -->
      <div class="card">
        <h2 class="text-sm font-medium text-white mb-4">外观设置</h2>
        <div class="space-y-4">
          <div>
            <label class="form-label">主题</label>
            <div class="flex gap-2 mt-1">
              <button
                @click="settings.theme = 'light'"
                :class="settings.theme === 'light' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500'"
                class="flex-1 px-4 py-2 text-sm rounded border border-stone-200 hover:border-stone-300 transition-colors"
              >
                浅色
              </button>
              <button
                @click="settings.theme = 'dark'"
                :class="settings.theme === 'dark' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500'"
                class="flex-1 px-4 py-2 text-sm rounded border border-stone-200 hover:border-stone-300 transition-colors"
              >
                深色
              </button>
              <button
                @click="settings.theme = 'auto'"
                :class="settings.theme === 'auto' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500'"
                class="flex-1 px-4 py-2 text-sm rounded border border-stone-200 hover:border-stone-300 transition-colors"
              >
                自动
              </button>
            </div>
          </div>

          <div>
            <label class="form-label">语言</label>
            <select
              v-model="settings.language"
              class="input-base mt-1 bg-white border-stone-200 text-stone-900 focus:border-stone-400 focus:ring-stone-400"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 配置信息 -->
      <div class="card">
        <h2 class="text-sm font-medium text-white mb-4">当前配置</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <span class="text-sm text-stone-500">服务器地址</span>
            <span class="text-sm text-stone-900 font-mono">{{ config?.server_addr || '未配置' }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <span class="text-sm text-stone-500">服务器端口</span>
            <span class="text-sm text-stone-900 font-mono">{{ config?.server_port || '-' }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <span class="text-sm text-stone-500">认证类型</span>
            <span class="text-sm text-stone-900">{{ config?.auth_type || '无' }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <span class="text-sm text-stone-500">代理数量</span>
            <span class="text-sm text-stone-900">{{ config?.proxies?.length || 0 }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
            <span class="text-sm text-stone-500">压缩</span>
            <span :class="config?.enable_compression ? 'text-emerald-600' : 'text-stone-400'" class="text-sm">
              {{ config?.enable_compression ? '已启用' : '未启用' }}
            </span>
          </div>
        </div>

        <div class="mt-4">
          <button @click="viewConfig" class="px-3 py-1.5 text-sm border border-stone-200 rounded hover:bg-stone-100 transition-colors flex items-center gap-1.5 text-stone-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            查看完整配置
          </button>
        </div>
      </div>

      <!-- 关于 -->
      <div class="card">
        <h2 class="text-sm font-medium text-stone-900 mb-4">关于</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-stone-500">版本号</span>
            <span class="text-sm text-stone-900 font-mono">v1.0.0</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-stone-500">框架</span>
            <span class="text-sm text-stone-900">Wails + Vue 3</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-stone-500">后端</span>
            <span class="text-sm text-stone-900">Go 1.26</span>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <button
        @click="saveSettings"
        :disabled="saving"
        class="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="saving" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.582 2.118 6.685 5.291 7.855V17.291z"></path>
        </svg>
        <span>保存设置</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useServiceStore } from '@/stores/service'
import type { Settings } from '@/types/storage'

const router = useRouter()
const serviceStore = useServiceStore()

const saving = ref(false)
const config = ref(serviceStore.config)

const settings = reactive<Settings>({
  autoStart: false,
  minToTray: true,
  theme: 'auto',
  language: 'zh-CN',
  lastWindowSize: [1200, 800],
  lastWindowPos: [0, 0],
})

const saveSettings = async () => {
  saving.value = true
  try {
    const json = JSON.stringify(settings)
    await window.go.Settings.SaveSettings(json)
    message.success('设置已保存')
  } catch (error: any) {
    message.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

const viewConfig = () => {
  if (!config.value) {
    message.warning('暂无配置')
    return
  }
  const configStr = JSON.stringify(config.value, null, 2)
  console.log(configStr)
  message.info('配置已输出到控制台')
}

const goBack = () => {
  router.push('/dashboard')
}

onMounted(async () => {
  // 加载保存的设置
  try {
    const savedSettings = await window.go.Settings.GetSettings()
    if (savedSettings) {
      Object.assign(settings, savedSettings)
    }
  } catch (error) {
    console.log('加载设置失败')
  }
})
</script>
