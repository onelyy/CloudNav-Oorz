export interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  categoryId: string;
  createdAt: number;
  pinned?: boolean; // New field for pinning
  pinnedOrder?: number; // Field for pinned link sorting order
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  password?: string; // Optional password for category protection
  requireAuth?: boolean; // 使用全站密码后才可查看该分类内容
}

export interface SiteSettings {
  title: string;
  navTitle: string;
  favicon: string;
  cardStyle: 'detailed' | 'simple';
  requirePasswordOnVisit: boolean;
  passwordExpiryDays: number; // 密码过期天数，0表示永久不退出
  background?: BackgroundSettings; // 自定义背景（2026-11 新增）
}

/** 背景类型：无 / 纯色 / 渐变 / 图片 / 必应每日一图 */
export type BackgroundType = 'none' | 'color' | 'gradient' | 'image' | 'bing';

export interface BackgroundSettings {
  type: BackgroundType;
  color: string;      // 纯色背景色
  gradient: string;   // 渐变（完整 CSS 值）
  imageUrl: string;   // 图片地址，或本地上传后的 dataURL
  blur: number;       // 背景模糊半径 px（0-30）
  dim: number;        // 遮罩暗化程度 %（0-80），图片太亮时压一点
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  type: 'none',
  color: '#0f172a',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  imageUrl: '',
  blur: 0,
  dim: 0,
};

/** 必应每日一图（第三方代理，可换成自己的图源） */
export const BING_BACKGROUND_URL = 'https://api.dujin.org/bing/1920.php';

export const GRADIENT_PRESETS: { name: string; value: string }[] = [
  { name: '极光', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: '暮色', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { name: '深海', value: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { name: '青柠', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { name: '午夜', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
  { name: '星云', value: 'radial-gradient(circle at 20% 20%, #7f5af0 0%, #2cb67d 45%, #16161a 100%)' },
  { name: '橘子汽水', value: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)' },
  { name: '晨雾', value: 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)' },
];

export interface AppState {
  links: LinkItem[];
  categories: Category[];
  darkMode: boolean;
  settings?: SiteSettings;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
}

export type AIProvider = 'gemini' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  websiteTitle?: string; // 网站标题 (浏览器标签)
  faviconUrl?: string; // 网站图标URL
  navigationName?: string;
}



// 搜索模式类型
export type SearchMode = 'internal' | 'external';

// 外部搜索源配置
export interface ExternalSearchSource {
  id: string;
  name: string;
  url: string;
  icon?: string;
  enabled: boolean;
  createdAt: number;
}

// 搜索配置
export interface SearchConfig {
  mode: SearchMode;
  externalSources: ExternalSearchSource[];
  selectedSource?: ExternalSearchSource | null; // 选中的搜索源
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'common', name: '常用推荐', icon: 'Star' },
  { id: 'dev', name: '开发工具', icon: 'Code' },
  { id: 'design', name: '设计资源', icon: 'Palette' },
  { id: 'read', name: '阅读资讯', icon: 'BookOpen' },
  { id: 'ent', name: '休闲娱乐', icon: 'Gamepad2' },
  { id: 'ai', name: '人工智能', icon: 'Bot' },
];

export const INITIAL_LINKS: LinkItem[] = [
  { id: '1', title: 'GitHub', url: 'https://github.com', categoryId: 'dev', createdAt: Date.now(), description: '代码托管平台', pinned: true, icon: 'https://www.faviconextractor.com/favicon/github.com?larger=true' },
  { id: '2', title: 'React', url: 'https://react.dev', categoryId: 'dev', createdAt: Date.now(), description: '构建Web用户界面的库', pinned: true, icon: 'https://www.faviconextractor.com/favicon/react.dev?larger=true' },
  { id: '3', title: 'Tailwind CSS', url: 'https://tailwindcss.com', categoryId: 'design', createdAt: Date.now(), description: '原子化CSS框架', pinned: true, icon: 'https://www.faviconextractor.com/favicon/tailwindcss.com?larger=true' },
  { id: '4', title: 'ChatGPT', url: 'https://chat.openai.com', categoryId: 'ai', createdAt: Date.now(), description: 'OpenAI聊天机器人', pinned: true, icon: 'https://www.faviconextractor.com/favicon/chat.openai.com?larger=true' },
  { id: '5', title: 'Gemini', url: 'https://gemini.google.com', categoryId: 'ai', createdAt: Date.now(), description: 'Google DeepMind AI', pinned: true, icon: 'https://www.faviconextractor.com/favicon/gemini.google.com?larger=true' },
];
