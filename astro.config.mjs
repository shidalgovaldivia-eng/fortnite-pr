import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://shidalgovaldivia-eng.github.io',
  base: '/fortnite-pr',
  output: 'static',
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: ['terminal.local']
    }
  }
});
