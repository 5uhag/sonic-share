import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
    base: './', // Ensures assets are loaded relative to the index.html on GitHub pages
    plugins: [
        basicSsl()
    ]
})
