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

  // 일별 구독자 기록 로드 (없거나 실패하면 빈 배열 → 증감 미표시)
  loadHistory: async () => {
    for (const url of CONFIG.HISTORY_DATA_URLS || []) {
      try {
        // 기록 파일이 늦게 와도 대시보드가 멈추지 않도록 5초 제한
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const json = await res.json();
        if (Array.isArray(json.snapshots)) return json.snapshots;
      } catch (e) {
        console.warn('[History] load failed:', url, e.message);
      }
    }
    return [];
  },

  // 실제 구독자 증감: 오늘(KST) 기준 N일 이전의 가장 최근 기록과 비교
  getSubscriberChange: (brandId, currentCount, snapshots) => {
    const DAY = 24 * 60 * 60 * 1000;
    const kstDate = (ms) => new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = kstDate(Date.now());
    const cutoff = kstDate(Date.now() - CONFIG.CHANGE_WINDOW_DAYS * DAY);
    let base = null;
    for (const snap of snapshots) {
      if (snap.date <= cutoff && snap.counts && typeof snap.counts[brandId] === 'number') {
        if (!base || snap.date > base.date) base = snap;
      }
    }
    if (!base) return null; // 기록이 아직 N일치 쌓이지 않음
    const days = Math.round((Date.parse(today) - Date.parse(base.date)) / DAY);
    return { change: currentCount - base.counts[brandId], days: days, since: base.date };
  },

  // 2. 통합 데이터 구축 (YouTube 실시간/Mock + Instagram 수동)
  loadAllData: async (forceRefresh = false) => {
    dataManager.state.loading = true;
    dataManager.state.error = null;
    
    try {
      const [, history] = await Promise.all([dataManager.loadBaseData(), dataManager.loadHistory()]);
      
      const apiKey = CONFIG.getYoutubeApiKey();
      dataManager.state.isMockMode = !apiKey;
      
      const combined = [];
      const now = new Date();
      
      for (const brand of dataManager.state.brands) {
        let ytData = null;
        let isLive = false; // 실제 YouTube 데이터(실시간 또는 1시간 캐시)일 때만 증감 계산
        
        // YouTube 데이터 로드 (실시간 API 또는 캐시 또는 Mock)
        if (apiKey) {
          try {
            if (forceRefresh) {
              // 새로고침 시 로컬 캐시 제거
              localStorage.removeItem(`yt_cache_${brand.id}`);
            }
            ytData = await youtubeApi.getBrandYoutubeData(brand.id, brand.youtube.handle);
            isLive = true;
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
            subscriberChange: isLive ? dataManager.getSubscriberChange(brand.id, ytData.subscriberCount, history) : null,
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
