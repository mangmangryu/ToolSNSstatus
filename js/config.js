// App Settings Configuration

const CONFIG_KEY_API = 'tool_brand_dashboard_yt_key';
const DEFAULT_API_KEY = 'AIzaSyCM-int91gPHsg_qxbPzAhVxhdKXo1xudo';

const CONFIG = {
  DEFAULT_API_KEY: DEFAULT_API_KEY,

  // 로컬 스토리지에서 API 키 로드 (없을 시 기본 키 제공)
  getYoutubeApiKey: () => {
    return localStorage.getItem(CONFIG_KEY_API) || DEFAULT_API_KEY;
  },
  
  // 로컬 스토리지에 API 키 저장
  setYoutubeApiKey: (key) => {
    if (key) {
      localStorage.setItem(CONFIG_KEY_API, key.trim());
    } else {
      localStorage.removeItem(CONFIG_KEY_API);
    }
  },
  
  // YouTube API 결과 캐시 유효 시간 (1시간)
  CACHE_TTL: 60 * 60 * 1000, 
  
  // 로컬 JSON 데이터 경로
  BRANDS_DATA_URL: 'data/brands.json',
  INSTAGRAM_DATA_URL: 'data/instagram.json'
};

// Global export for non-module script files
window.CONFIG = CONFIG;
