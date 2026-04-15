<template>
  <div class="min-h-screen flex items-center justify-center bg-black">
    <!-- 登录容器 -->
    <div class="w-full max-w-sm mx-4 animate-fade-in">
      <!-- Logo 和标题 -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white/10 mb-4">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-white">NexusLink</h1>
        <p class="text-sm text-gray-500 mt-1">远程内网穿透工具</p>
      </div>

      <!-- 登录表单 -->
      <div class="bg-[#171717] border border-[#262626] rounded-lg p-6">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label for="token" class="form-label">API Token</label>
            <div class="relative">
              <input
                id="token"
                v-model="form.token"
                type="password"
                placeholder="输入您的 API Token"
                class="input-base pl-10"
                :class="{ 'border-[#F59E0B]': touched }"
                @blur="touched = true"
              />
              <svg class="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6m6-6a6 6 0 11-12 0m12 0a2 2 0 11-4 0m14 0a2 2 0 11-4 0M5 7a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <p v-if="error" class="text-sm text-[#F59E0B] mt-1">{{ error }}</p>
          </div>

          <label class="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              v-model="remember"
              class="w-4 h-4 rounded border-[#262626] bg-[#171717] text-[#F59E0B] focus:ring-[#F59E0B] focus:ring-offset-0 focus:ring-offset-black"
            />
            <span class="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">记住我的登录信息</span>
          </label>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.582 2.118 6.685 5.291 7.855V17.291z"></path>
            </svg>
            <span>{{ loading ? '登录中...' : '登录' }}</span>
          </button>
        </form>
      </div>

      <!-- 帮助链接 -->
      <p class="text-center text-sm text-gray-500 mt-4">
        首次使用？
        <a href="#" class="text-gray-400 hover:text-white transition-colors underline">获取 Token 指南</a>
      </p>
    </div>

    <!-- 版本信息 -->
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-600">
      v1.0.0
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore, type UserInfo } from '@/stores/auth'
import { useServiceStore } from '@/stores/service'

const router = useRouter()
const authStore = useAuthStore()
const serviceStore = useServiceStore()

const form = reactive({ token: '' })
const remember = ref(false)
const loading = ref(false)
const touched = ref(false)
const error = ref('')

// 清空错误信息当用户输入时
watch(() => form.token, () => {
  if (error.value) error.value = ''
})

const handleLogin = async () => {
  touched.value = true

  if (!form.token.trim()) {
    error.value = '请输入 Token'
    return
  }

  loading.value = true
  try {
    // 调用 Go 后端登录
    const success: boolean = await window.go.Auth.Login(form.token)

    if (success) {
      // 设置本地状态
      authStore.setToken(form.token)

      // 获取用户信息
      try {
        const userInfo: UserInfo = await window.go.Auth.GetUserInfo()
        authStore.setUserInfo(userInfo)
      } catch (e) {
        console.warn('获取用户信息失败:', e)
      }

      // 加载本地配置
      try {
        const config = await window.go.Config.LoadLocalConfig()
        if (config) {
          serviceStore.setConfig(config)
          serviceStore.setProxies([])
        }
      } catch (e) {
        console.log('未找到本地配置')
      }

      message.success('登录成功')

      // 跳转到首页
      router.push('/dashboard')
    } else {
      error.value = '登录失败，请检查 Token'
    }
  } catch (err: any) {
    console.error('登录错误:', err)
    error.value = '登录失败：' + (err.message || '未知错误')
  } finally {
    loading.value = false
  }
}
</style>
