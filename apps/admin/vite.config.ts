import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    host: true,       // Expõe o servidor para a rede local (0.0.0.0) - Vital para WSL2
    port: 5173,       // Porta padrão
    strictPort: false // Permite 5174 se a 5173 estiver ocupada
  }
})
