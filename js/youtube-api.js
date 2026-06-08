// YouTube Data API Client

const youtubeApi = {
  // 캐시 로드
  getCache: (brandId) => {
    const cached = localStorage.getItem(`yt_cache_${brandId}`);
    if (!cached) return null;
    
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CONFIG.CACHE_TTL) {
        return data;
      }
    } catch (e) {
      console.error('Error parsing cache', e);
    }
    return null;
  },

  // 캐시 저장
  setCache: (brandId, data) => {
    try {
      const now = Date.now();
      localStorage.setItem(`yt_cache_${brandId}`, JSON.stringify({
        timestamp: now,
        data: data
      }));
      // 가장 최근 실시간 API 성공 시간 기록 (1시간 제한 체크용)
      localStorage.setItem('yt_last_live_refresh', now.toString());
    } catch (e) {
      console.error('Error saving cache', e);
    }
  },

  // GET Request wrapper
  fetchFromApi: async (endpoint, params = {}) => {
    const key = CONFIG.getYoutubeApiKey();
    if (!key) {
      throw new Error('API Key is missing');
    }
    
    const queryParams = new URLSearchParams({
      ...params,
      key: key
    });
    
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = errorData.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(errMsg);
    }
    
    return await response.json();
  },

  // 1. 핸들로 채널 기본 정보 및 ID 조회
  getChannelInfo: async (handle) => {
    // 핸들에 @가 있으면 제거하고 쿼리
    const cleanedHandle = handle.startsWith('@') ? handle.substring(1) : handle;
    const data = await youtubeApi.fetchFromApi('channels', {
      part: 'snippet,statistics',
      forHandle: cleanedHandle
    });
    
    if (!data.items || data.items.length === 0) {
      throw new Error(`Channel not found for handle: ${handle}`);
    }
    
    const channel = data.items[0];
    return {
      channelId: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url || '',
      subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
      videoCount: parseInt(channel.statistics.videoCount) || 0,
    };
  },

  // 2. 업로드 플레이리스트(UU로 시작)에서 최근 비디오 목록 조회
  getRecentUploads: async (channelId) => {
    // 채널 ID의 UC... 접두사를 UU...로 변경하면 업로드 플레이리스트 ID가 됨
    const uploadsPlaylistId = 'UU' + channelId.substring(2);
    
    const data = await youtubeApi.fetchFromApi('playlistItems', {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 15 // 최근 15개 영상 조회
    });
    
    return data.items || [];
  },

  // 3. 비디오 상세 정보 조회 (재생시간, 조회수 등)
  getVideoDetails: async (videoIds) => {
    if (videoIds.length === 0) return [];
    
    const data = await youtubeApi.fetchFromApi('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(',')
    });
    
    return data.items || [];
  },

  // 4. 특정 브랜드의 전체 YouTube 데이터 조회 통합 함수
  getBrandYoutubeData: async (brandId, handle) => {
    // 1. 캐시 확인
    const cachedData = youtubeApi.getCache(brandId);
    if (cachedData) {
      console.log(`[YouTube API] Using cached data for ${brandId}`);
      return cachedData;
    }

    console.log(`[YouTube API] Fetching live data for ${brandId} (${handle})...`);
    
    // 2. 채널 기본 정보 조회
    const channelInfo = await youtubeApi.getChannelInfo(handle);
    
    // 3. 최근 업로드 목록 조회
    const uploads = await youtubeApi.getRecentUploads(channelInfo.channelId);
    
    // 7일 전 시간 구하기
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 최근 7일 영상 필터링
    const recentUploadIds = [];
    const uploadItemMap = {};
    
    for (const item of uploads) {
      const publishDate = new Date(item.snippet.publishedAt);
      if (publishDate >= sevenDaysAgo) {
        const videoId = item.snippet.resourceId.videoId;
        recentUploadIds.push(videoId);
        uploadItemMap[videoId] = item;
      }
    }
    
    // 4. 필터링된 영상들의 상세 정보 일괄 조회
    let recentVideos = [];
    if (recentUploadIds.length > 0) {
      const videoDetails = await youtubeApi.getVideoDetails(recentUploadIds);
      
      recentVideos = videoDetails.map(video => {
        const durationSec = utils.getDurationSeconds(video.contentDetails.duration);
        const isShorts = durationSec <= 60; // 60초 이하는 Shorts로 분류
        
        return {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description || '',
          thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '',
          publishedAt: video.snippet.publishedAt,
          views: parseInt(video.statistics.viewCount) || 0,
          duration: utils.parseDuration(video.contentDetails.duration),
          isShorts: isShorts
        };
      });
    }
    
    const result = {
      subscriberCount: channelInfo.subscriberCount,
      videoCount: channelInfo.videoCount,
      recentVideos: recentVideos
    };
    
    // 5. 결과 캐시 저장
    youtubeApi.setCache(brandId, result);
    return result;
  }
};

window.youtubeApi = youtubeApi;
