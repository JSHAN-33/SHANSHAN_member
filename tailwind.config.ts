import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色：深棕色（按鈕、標題）
        primary: '#5C4D42',
        'primary-hover': '#4A3D34',
        // 綠色：空檔/可預約
        available: '#52B788',
        'available-light': '#E8F5EE',
        // 背景
        bg: '#F2F0EC',
        surface: '#FFFFFF',
        // 中性灰
        muted: '#9CA3AF',
        subtle: '#F5F3F0',
        // 金色：優惠
        gold: '#D4A853',
        'gold-light': '#FDF6E3',
        // 紅色：費用
        danger: '#DC2626',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang TC"',
          '"Microsoft JhengHei"',
          '"Noto Sans TC"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
