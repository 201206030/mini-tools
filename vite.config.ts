import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // uni-app 编译器仍使用 Dart Sass 的 legacy JS API，屏蔽已知的废弃提示
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin']
      }
    }
  }
})
