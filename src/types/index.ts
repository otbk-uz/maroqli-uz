export interface DeveloperDetails {
  username: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role?: 'USER' | 'GAMEDEV' | 'ADMIN' | 'STREAMER' | null;
  studio_name?: string | null;
  studio_logo?: string | null;
  telegram_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  github_url?: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  region?: string | null;
  phone_number?: string | null;
  role: 'USER' | 'GAMEDEV' | 'ADMIN' | 'STREAMER';
  balance?: number;
  xp?: number;
  level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover?: string | null;
  price: string | number;
  premium_price?: string | number | null;
  platform: 'WEB' | 'PC' | 'MOBILE';
  rating: number;
  language: string;
  sys_requirements?: string | null;
  screenshots?: string[];
  video_url?: string | null;
  demo_url?: string | null;
  download_url?: string | null;
  executable_path?: string | null;
  developer_id?: string;
  developer_details: DeveloperDetails;
  created_at?: string;
}

export interface Tournament {
  id: string;
  title: string;
  game_name: string;
  prize_pool: string;
  start_time: string;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  max_participants: number;
  current_participants?: number;
  banner_url?: string | null;
  description?: string;
  rules?: string;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  content?: string;
  excerpt: string;
  cover_image?: string | null;
  author: string;
  category?: string;
  created_at: string;
}

export interface GameScore {
  id: string;
  game_slug: string;
  user_id?: string;
  score: number;
  username: string;
  full_name?: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface DownloadProgressData {
  slug: string;
  percent: number;
  speed: string;
  downloadedMb: string;
  totalMb: string;
}

export interface ElectronAPI {
  checkInstalled: (slug: string, executablePath?: string | null) => Promise<boolean>;
  downloadGame: (slug: string, downloadUrl: string, executablePath?: string | null) => Promise<{ success: boolean; error?: string }>;
  launchGame: (slug: string, executablePath?: string | null) => Promise<{ success: boolean; error?: string }>;
  onDownloadProgress: (callback: (data: DownloadProgressData) => void) => () => void;
}
