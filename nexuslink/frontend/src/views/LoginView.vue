<template>
  <div class="login-shell min-h-screen px-4 py-10 sm:px-6">
    <div class="login-backdrop"></div>
    <div class="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
      <section class="login-panel grid w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/92 shadow-[0_28px_90px_rgba(28,25,23,0.12)] lg:grid-cols-[1.1fr_0.9fr]">
        <div class="hidden lg:flex flex-col justify-between border-r border-stone-200/80 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_42%),linear-gradient(180deg,_#fcfbf8_0%,_#f5f5f4_100%)] p-10">
          <div>
            <div class="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg shadow-stone-900/20">
              <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p class="text-sm font-medium uppercase tracking-[0.28em] text-amber-700/80">NexusLink</p>
            <h1 class="mt-4 text-4xl font-semibold tracking-tight text-stone-900">连接你的内网服务，少一点折腾。</h1>
            <p class="mt-4 max-w-md text-base leading-7 text-stone-600">
              当前是开发阶段，已经为你预留了测试 Token。直接输入或一键填入
              <span class="font-semibold text-stone-900">123456</span>
              即可登录。
            </p>
          </div>
          <div class="rounded-2xl border border-stone-200/80 bg-white/80 p-5 backdrop-blur">
            <p class="text-sm font-medium text-stone-900">开发提示</p>
            <p class="mt-2 text-sm leading-6 text-stone-600">
              这个快捷登录只用于当前开发调试，不会影响正常 Token 登录流程。
            </p>
          </div>
        </div>

        <div class="p-6 sm:p-8 lg:p-10">
          <div class="mx-auto w-full max-w-md animate-fade-in">
            <div class="mb-8 lg:hidden">
              <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 class="text-2xl font-semibold tracking-tight text-stone-900">登录 NexusLink</h1>
              <p class="mt-2 text-sm leading-6 text-stone-600">输入 API Token 继续，开发环境可直接使用 123456。</p>
            </div>

            <div class="mb-8 hidden lg:block">
              <p class="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">Sign In</p>
              <h2 class="mt-3 text-3xl font-semibold tracking-tight text-stone-900">欢迎回来</h2>
              <p class="mt-2 text-sm leading-6 text-stone-600">使用你的 API Token 登录控制台。</p>
            </div>

            <form @submit.prevent="handleLogin" class="space-y-5">
              <div class="space-y-2">
                <label for="token" class="form-label !mb-0">API Token</label>
                <a-input-password
                  id="token"
                  v-model:value="form.token"
                  size="large"
                  class="login-password"
                  placeholder="输入您的 API Token"
                  :status="error ? 'error' : undefined"
                  @blur="touched = true"
                >
                  <template #prefix>
                    <svg class="h-4 w-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-6 6m6-6a6 6 0 11-12 0m12 0a2 2 0 11-4 0m14 0a2 2 0 11-4 0M5 7a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5z" />
                    </svg>
                  </template>
                </a-input-password>
                <div class="flex items-center justify-between gap-3 text-sm">
                  <p v-if="error" class="text-amber-700">{{ error }}</p>
                  <p v-else class="text-stone-500">Token 不会明文展示，支持粘贴登录。</p>
                  <button
                    v-if="showDevHelper"
                    type="button"
                    class="font-medium text-amber-700 transition hover:text-amber-800"
                    @click="fillDevToken"
                  >
                    填入开发 Token
                  </button>
                </div>
              </div>

              <label class="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 cursor-pointer transition hover:border-stone-300">
                <input
                  type="checkbox"
                  v-model="remember"
                  class="h-4 w-4 rounded border-stone-300 bg-white text-amber-600 focus:ring-amber-600 focus:ring-offset-0"
                />
                <span class="text-sm text-stone-600">记住我的登录状态</span>
              </label>

              <button
                type="submit"
                :disabled="loading"
                class="w-full btn-primary flex min-h-[48px] items-center justify-center gap-2 rounded-2xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg v-if="loading" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.582 2.118 6.685 5.291 7.855V17.291z"></path>
                </svg>
                <span>{{ loading ? '登录中...' : '登录' }}</span>
              </button>
            </form>

            <p class="mt-6 text-center text-sm text-stone-500">
              首次使用？
              <span class="font-medium text-stone-700">开发环境可直接使用测试 Token 123456</span>
            </p>
          </div>
        </div>
      </section>

      <div class="pointer-events-none absolute inset-x-10 bottom-0 -z-10 h-32 rounded-full bg-amber-200/40 blur-3xl"></div>
    </div>

    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-stone-400">
      v1.0.0
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { InputPassword, message } from 'ant-design-vue'
import { useAuthStore, type UserInfo } from '@/stores/auth'
import { useServiceStore } from '@/stores/service'

const AInputPassword = InputPassword
const devToken = '123456'
const showDevHelper = import.meta.env.DEV

const router = useRouter()
const authStore = useAuthStore()
const serviceStore = useServiceStore()

const form = reactive({ token: showDevHelper ? devToken : '' })
const remember = ref(false)
const loading = ref(false)
const touched = ref(false)
const error = ref('')

watch(() => form.token, () => {
  if (error.value) error.value = ''
})

const fillDevToken = () => {
  form.token = devToken
  touched.value = true
}

const handleLogin = async () => {
  touched.value = true

  if (!form.token.trim()) {
    error.value = '请输入 Token'
    return
  }

  loading.value = true
  try {
    // 调用后端 Login，后端已支持 123456 直接通过
    const success: boolean = await window.go.Auth.Login(form.token)

    if (success) {
      authStore.setToken(form.token)

      // 获取用户信息（后端对 123456 返回开发用户）
      const userInfo: UserInfo = await window.go.Auth.GetUserInfo()
      authStore.setUserInfo(userInfo)

      // 加载本地配置
      try {
        const config = await window.go.Config.LoadLocalConfig()
        if (config) {
          serviceStore.setConfig(config)
          serviceStore.setProxies([])
        }
      } catch (err) {
        console.log('未找到本地配置:', err)
      }

      message.success('登录成功')
      router.push('/dashboard')
      return
    }

    error.value = '登录失败，请检查 Token'
  } catch (err: any) {
    console.error('登录错误:', err)
    error.value = '登录失败：' + (err?.message || '未知错误')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-shell {
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.2), transparent 28%),
    radial-gradient(circle at right 15%, rgba(120, 113, 108, 0.12), transparent 24%),
    linear-gradient(180deg, #fcfbf8 0%, #f5f5f4 100%);
}

.login-backdrop {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.6) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 78%);
  pointer-events: none;
}

:deep(.login-password.ant-input-affix-wrapper) {
  min-height: 52px;
  border-radius: 18px;
  border-color: rgb(214 211 209);
  padding-inline: 16px;
  box-shadow: none;
}

:deep(.login-password.ant-input-affix-wrapper:hover) {
  border-color: rgb(168 162 158);
}

:deep(.login-password.ant-input-affix-wrapper-focused),
:deep(.login-password.ant-input-affix-wrapper:focus) {
  border-color: rgb(180 83 9);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.12);
}

:deep(.login-password .ant-input) {
  font-size: 15px;
  color: rgb(28 25 23);
}

:deep(.login-password .ant-input::placeholder) {
  color: rgb(168 162 158);
}
</style>
