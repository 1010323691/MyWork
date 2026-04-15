import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { ConfigProvider } from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('AConfigProvider', ConfigProvider)

app.mount('#app')
