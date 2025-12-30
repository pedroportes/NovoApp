import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
    css: {
        postcss: {
            plugins: [
                tailwindcss,
                autoprefixer,
            ],
        },
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            // includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
                name: 'FlowDrain SaaS',
                short_name: 'FlowDrain',
                description: 'Sistema de Gestão FlowDrain',
                theme_color: '#09090b',
                background_color: '#09090b',
                display: 'standalone',
                // icons: [
                //     {
                //         src: 'pwa-192x192.png',
                //         sizes: '192x192',
                //         type: 'image/png'
                //     },
                //     {
                //         src: 'pwa-512x512.png',
                //         sizes: '512x512',
                //         type: 'image/png'
                //     }
                // ]
            }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(process.cwd(), './src'),
        },
    },
})
