import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对 base：可部署在根目录、子目录（如 GitHub Pages 的 /仓库名/）或任意静态托管
  base: './',
  plugins: [react()],
  server: {
    // 手机与电脑同一 WiFi 时，用局域网 IP 访问即可真机调试
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    target: 'es2019',
  },
})
