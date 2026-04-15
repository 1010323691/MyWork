<template>
  <div class="min-h-screen bg-stone-50">
    <!-- 顶部导航 -->
    <nav class="border-b border-stone-200 sticky top-0 z-50 bg-stone-50/80 backdrop-blur">
      <div class="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="inline-flex w-8 h-8 items-center justify-center rounded bg-stone-900 text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-medium text-stone-900">NexusLink</h1>
            <p class="text-xs text-stone-500">
              {{ userInfo?.name || '用户' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="goToSettings" class="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors rounded hover:bg-stone-100">
            设置
          </button>
          <button @click="handleLogout" class="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors rounded hover:bg-stone-100">
            退出
          </button>
        </div>
      </div>
    </nav>

    <!-- 主内容区 -->
    <div class="max-w-6xl mx-auto p-6">
      <!-- 错误提示 -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-white border border-red-200 rounded text-sm text-red-600 flex items-center justify-between shadow-sm">
        <span>{{ errorMessage }}</span>
        <button @click="serviceStore.clearErrorMessage()" class="opacity-50 hover:opacity-100">×</button>
      </div>

      <!-- 状态卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <!-- 服务状态 -->
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-stone-500 mb-1">服务状态</p>
              <p class="text-lg font-medium text-stone-900">{{ statusLabel }}</p>
            </div>
            <div :class="statusDotClass" class="w-2.5 h-2.5 rounded-full"></div>
          </div>
        </div>

        <!-- 运行时间 -->
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-stone-500 mb-1">运行时间</p>
              <p class="text-lg font-medium text-stone-900">{{ uptime }}</p>
            </div>
            <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <!-- 代理数量 -->
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-stone-500 mb-1">代理数量</p>
              <p class="text-lg font-medium text-stone-900">{{ proxies.length }}</p>
            </div>
            <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          @click="startService"
          :disabled="serviceStatus === 'running' || loading"
          class="btn-primary min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          </svg>
          启动
        </button>
        <button
          @click="stopService"
          :disabled="serviceStatus !== 'running' || loading"
          class="btn-secondary min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          停止
        </button>
        <button
          @click="refreshConfig"
          :disabled="loading"
          class="px-3 py-1.5 text-sm border border-stone-200 rounded hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-stone-700"
        >
          刷新配置
        </button>
        <button
          @click="fetchConfig"
          :disabled="loading"
          class="px-3 py-1.5 text-sm border border-stone-200 rounded hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-stone-700"
        >
          获取配置
        </button>
      </div>

      <!-- 代理列表 -->
      <div class="card mb-6">
        <h2 class="text-sm font-medium text-stone-900 mb-4">代理列表</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-stone-200">
              <tr class="text-stone-500">
                <th class="pb-2.5 font-normal">名称</th>
                <th class="pb-2.5 font-normal">类型</th>
                <th class="pb-2.5 font-normal">本地端口</th>
                <th class="pb-2.5 font-normal">远程端口</th>
                <th class="pb-2.5 font-normal">状态</th>
                <th class="pb-2.5 font-normal text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proxy in proxies" :key="proxy.name" class="border-b border-stone-100 last:border-0">
                <td class="py-3 text-stone-900">{{ proxy.name }}</td>
                <td class="py-3 text-stone-500">{{ proxy.type }}</td>
                <td class="py-3 text-stone-500 font-mono">{{ proxy.local_port }}</td>
                <td class="py-3 text-stone-500 font-mono">{{ proxy.remote_port }}</td>
                <td class="py-3">
                  <span :class="proxy.status === 'online' ? 'text-emerald-600' : 'text-stone-400'" class="text-xs">
                    {{ proxy.status === 'online' ? '运行中' : '已停止' }}
                  </span>
                </td>
                <td class="py-3">
                  <div class="flex items-center gap-1 justify-end">
                    <button class="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button @click="() => confirmDelete(proxy)" class="p-1 text-stone-400 hover:text-red-600 rounded hover:bg-stone-100 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="proxies.length === 0">
                <td colspan="6" class="py-8 text-center text-stone-400">暂无代理配置</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 日志面板 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-medium text-stone-900">日志</h2>
          <span class="text-xs text-stone-500">{{ logs.length }} 条记录</span>
        </div>
        <div class="bg-stone-50 border border-stone-200 rounded p-3 font-mono text-xs h-64 overflow-y-auto">
          <div v-for="(log, index) in logs" :key="index" class="mb-1">
            <span class="text-stone-400">[{{ formatTime(log.time) }}]</span>
            <span :class="logLevelBadge(log.level)" class="mx-2">
              {{ log.level }}
            </span>
            <span class="text-stone-600">{{ log.message }}</span>
          </div>
          <div v-if="logs.length === 0" class="text-stone-400">
            暂无日志...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { useServiceStore, type NexusConfig } from '@/stores/service'

const router = useRouter()
const authStore = useAuthStore()
const serviceStore = useServiceStore()

const loading = ref(false)
const errorMessage = ref('')
const updateTimer = ref<number | null>(null)

const serviceStatus = computed(() => serviceStore.status)
const uptime = computed(() => serviceStore.uptime)
const proxies = computed(() => serviceStore.proxies)
const logs = computed(() => serviceStore.logs)
const userInfo = computed(() => authStore.userInfo)

const statusColor = computed(() => serviceStore.statusColor)
const statusLabel = computed(() => serviceStore.statusLabel)

// 状态指示器颜色
const statusDotClass = computed(() => {
  if (serviceStatus.value === 'running') return 'bg-[#10B981]'
  if (serviceStatus.value === 'error') return 'bg-[#EF4444]'
  return 'bg-gray-500'
})

// 日志级别徽章样式
const logLevelBadge = (level: string) => {
  const styles: Record<string, string> = {
    debug: 'text-blue-400',
    info: 'text-green-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  }
  return styles[level.toLowerCase()] || 'text-gray-400'
}

// 格式化时间
const formatTime = (timeStr: string) => {
  return timeStr.replace('T', ' ').substring(0, 19)
}

const startService = async () => {
  loading.value = true
  try {
    await window.go.Service.StartService()
    message.success('服务启动成功')
    updateStatus()
  } catch (error: any) {
    message.error('启动失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const stopService = async () => {
  loading.value = true
  try {
    await window.go.Service.StopService()
    message.success('服务已停止')
    updateStatus()
  } catch (error: any) {
    message.error('停止失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const refreshConfig = async () => {
  loading.value = true
  try {
    const config: NexusConfig = await window.go.Config.LoadLocalConfig()
    serviceStore.setConfig(config)
    const proxiesStatus = await window.go.Service.GetProxies()
    serviceStore.setProxies(proxiesStatus)
    message.success('配置已刷新')
  } catch (error: any) {
    message.error('刷新失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const fetchConfig = async () => {
  loading.value = true
  try {
    const config: NexusConfig = await window.go.Config.FetchConfig()
    serviceStore.setConfig(config)
    message.success('配置获取成功')

    // 同时刷新 nexuslink 配置
    const frpcConfig = await window.go.Service.FetchFrpConfig()
    console.log('Frp config:', frpcConfig)

    // 刷新代理列表
    const proxiesStatus = await window.go.Service.GetProxies()
    serviceStore.setProxies(proxiesStatus)
  } catch (error: any) {
    message.error('获取配置失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const confirmDelete = (proxy: any) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除代理 "${proxy.name}" 吗？`,
    onOk: async () => {
      try {
        // TODO: 实现删除逻辑
        message.info('删除功能待实现')
      } catch (error: any) {
        message.error('删除失败：' + (error.message || '未知错误'))
      }
    },
  })
}

const updateStatus = async () => {
  const status = window.go.Service.GetServiceStatus()
  serviceStore.setStatus(status as 'running' | 'stopped' | 'error')

  const uptime = window.go.Service.GetServiceUptime()
  serviceStore.setUptime(uptime)

  const proxiesStatus = await window.go.Service.GetProxies()
  serviceStore.setProxies(proxiesStatus)
}

const goToSettings = () => {
  router.push('/settings')
}

const handleLogout = () => {
  Modal.confirm({
    title: '确认退出',
    content: '确定要退出登录吗？',
    onOk: async () => {
      try {
        await window.go.Auth.Logout()
        authStore.logout()
        router.push('/login')
        message.success('已退出登录')
      } catch (error: any) {
        message.error('退出失败：' + (error.message || '未知错误'))
      }
    },
  })
}

// 定时更新状态
const startStatusUpdate = () => {
  updateStatus()
  updateTimer.value = setInterval(() => {
    if (serviceStatus.value === 'running') {
      updateStatus()
    }
  }, 5000)
}

onMounted(() => {
  startStatusUpdate()

  // 获取日志
  const serviceLogs = window.go.Service.GetLogs(50)
  serviceStore.addLogs(serviceLogs)
})

onUnmounted(() => {
  if (updateTimer.value) {
    clearInterval(updateTimer.value)
  }
})
</script>
