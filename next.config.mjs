/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      // Brand assets
      { source: '/logo.jpg.png', destination: '/images/brand/logo.jpg.png' },
      { source: '/hero_bg.png', destination: '/images/brand/hero_bg.png' },
      { source: '/favicon.ico', destination: '/images/brand/favicon.ico' },

      // Game covers backward compatibility
      { source: '/death_mine_cover.png', destination: '/images/covers/death_mine_cover.png' },
      { source: '/isle_of_forgotten_memories_cover.png', destination: '/images/covers/isle_of_forgotten_memories_cover.png' },
      { source: '/shiroq_cover.jpg', destination: '/images/covers/shiroq_cover.jpg' },
      { source: '/stk_cover.png', destination: '/images/covers/stk_cover.png' },
      { source: '/xonotic_cover.png', destination: '/images/covers/xonotic_cover.png' },

      // News & Lessons
      { source: '/news1.png', destination: '/images/news/news1.png' },
      { source: '/news2.png', destination: '/images/news/news2.png' },
      { source: '/lesson:path*', destination: '/images/lessons/lesson:path*' },
      { source: '/gamedev_lesson:path*', destination: '/images/lessons/gamedev_lesson:path*' },
      { source: '/math_lesson:path*', destination: '/images/lessons/math_lesson:path*' },

      // Game downloads
      { source: '/Death-Mine.zip', destination: '/downloads/games/Death-Mine.zip' },
      { source: '/Isle-of-Forgotten-Memories.rar', destination: '/downloads/games/Isle-of-Forgotten-Memories.rar' },
      { source: '/SHIROQ_v1.1.rar', destination: '/downloads/games/SHIROQ_v1.1.rar' },
      { source: '/SuperTuxKart-1.5-setup.exe', destination: '/downloads/games/SuperTuxKart-1.5-setup.exe' },
      { source: '/SuperTuxKart-1.5-src.tar.gz', destination: '/downloads/games/SuperTuxKart-1.5-src.tar.gz' },
      { source: '/xonotic-0.8.6.zip', destination: '/downloads/games/xonotic-0.8.6.zip' },

      // Screenshots
      { source: '/shiroq_screenshots/:path*', destination: '/images/screenshots/shiroq/:path*' },
    ];
  },
};

export default nextConfig;
