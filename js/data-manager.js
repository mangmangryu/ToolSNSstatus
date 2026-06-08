// Unified Data Manager

const dataManager = {
  // 전체 데이터 상태
  state: {
    brands: [],
    instagramData: null,
    combinedData: [],
    isMockMode: true,
    lastUpdated: null,
    loading: false,
    error: null
  },

  // 1. 브랜드 및 인스타그램 기본 데이터 로드
  loadBaseData: async () => {
    try {
      const [brandsRes, igRes] = await Promise.all([
        fetch(CONFIG.BRANDS_DATA_URL),
        fetch(CONFIG.INSTAGRAM_DATA_URL)
      ]);

      if (!brandsRes.ok || !igRes.ok) {
        throw new Error('Failed to load JSON data files');
      }

      dataManager.state.brands = await brandsRes.json();
      dataManager.state.instagramData = await igRes.json();
    } catch (e) {
      console.error('Error loading base JSON files', e);
      throw e;
    }
  },

  // 2. 통합 데이터 구축 (YouTube 실시간/Mock + Instagram 수동)
  loadAllData: async (forceRefresh = false) => {
    dataManager.state.loading = true;
    dataManager.state.error = null;
    
    try {
      await dataManager.loadBaseData();
      
      const apiKey = CONFIG.getYoutubeApiKey();
      dataManager.state.isMockMode = !apiKey;
      
      const combined = [];
      const now = new Date();
      
      for (const brand of dataManager.state.brands) {
        let ytData = null;
        
        // YouTube 데이터 로드 (실시간 API 또는 캐시 또는 Mock)
        if (apiKey) {
          try {
            if (forceRefresh) {
              // 새로고침 시 로컬 캐시 제거
              localStorage.removeItem(`yt_cache_${brand.id}`);
            }
            ytData = await youtubeApi.getBrandYoutubeData(brand.id, brand.youtube.handle);
          } catch (e) {
            console.warn(`[YouTube API Fail] Falling back to Mock for ${brand.name}: ${e.message}`);
            ytData = brand.youtube.mockData;
          }
        } else {
          // API Key가 없으면 Mock 모드
          ytData = brand.youtube.mockData;
        }

        // Instagram 데이터 추출
        const igBrandData = dataManager.state.instagramData.brands[brand.id] || {
          followers: 0,
          postsCount: 0,
          recentPosts: []
        };

        // 7일 내 업로드 수 계산 (YouTube)
        const video7Days = ytData.recentVideos.filter(v => !v.isShorts).length;
        const shorts7Days = ytData.recentVideos.filter(v => v.isShorts).length;

        // 7일 내 업로드 수 계산 (Instagram)
        const post7Days = igBrandData.recentPosts.filter(p => p.type === 'post').length;
        const reel7Days = igBrandData.recentPosts.filter(p => p.type === 'reel').length;

        combined.push({
          id: brand.id,
          name: brand.name,
          logo: brand.logo,
          color: brand.color,
          colorRgb: brand.colorRgb,
          youtube: {
            handle: brand.youtube.handle,
            url: brand.youtube.url || `https://www.youtube.com/@${brand.youtube.handle}`,
            subscriberCount: ytData.subscriberCount,
            subscriberChange: brand.youtube.subscriberChange || 0,
            videoCount: ytData.videoCount,
            recentVideos: ytData.recentVideos,
            videoCount7Days: video7Days,
            shortsCount7Days: shorts7Days
          },
          instagram: {
            handle: brand.instagram.handle,
            url: brand.instagram.url || `https://www.instagram.com/${brand.instagram.handle}/`,
            followers: igBrandData.followers,
            followersChange: igBrandData.followersChange || 0,
            postsCount: igBrandData.postsCount,
            recentPosts: igBrandData.recentPosts,
            postCount7Days: post7Days,
            reelCount7Days: reel7Days
          }
        });
      }

      dataManager.state.combinedData = combined;
      dataManager.state.lastUpdated = new Date().toISOString();
      dataManager.state.loading = false;
      return combined;
      
    } catch (e) {
      dataManager.state.loading = false;
      dataManager.state.error = e.message;
      console.error('Error combining data:', e);
      throw e;
    }
  },

  // 특정 브랜드 ID로 상세 데이터 가져오기
  getBrandDetail: (brandId) => {
    return dataManager.state.combinedData.find(b => b.id === brandId) || null;
  }
};

window.dataManager = dataManager;
