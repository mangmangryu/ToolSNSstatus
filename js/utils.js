// Helper Utility Functions

const utils = {
  // 숫자 포맷 (예: 54200 -> 54.2K, 1540000 -> 1.5M)
  formatNumber: (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    
    const value = Number(num);
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return value.toLocaleString();
  },

  // 상대 시간 표시 (예: "3일 전", "방금 전")
  getRelativeTime: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    
    // 30일이 지나면 그냥 날짜 표시
    return utils.formatDate(dateString);
  },

  // 기본 날짜 포맷 (예: "6월 2일")
  formatDate: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  },

  // 텍스트 말줄임
  truncateText: (text, maxLength = 60) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  // ISO 8601 동영상 재생 시간 파서 (예: "PT8M42S" -> "8:42", "PT0M58S" -> "0:58")
  parseDuration: (durationStr) => {
    if (!durationStr) return '0:00';
    
    // e.g. PT1H2M10S, PT15M, PT45S
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationStr.match(regex);
    
    if (!matches) return '0:00';
    
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    const seconds = parseInt(matches[3]) || 0;
    
    let result = '';
    
    if (hours > 0) {
      result += hours + ':';
      result += (minutes < 10 ? '0' : '') + minutes + ':';
    } else {
      result += minutes + ':';
    }
    
    result += (seconds < 10 ? '0' : '') + seconds;
    
    return result;
  },
  
  // 초단위 반환 (Shorts 판별용: 60초 이하인지 확인)
  getDurationSeconds: (durationStr) => {
    if (!durationStr) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = durationStr.match(regex);
    if (!matches) return 0;
    
    const hours = parseInt(matches[1]) || 0;
    const minutes = parseInt(matches[2]) || 0;
    const seconds = parseInt(matches[3]) || 0;
    
    return (hours * 3600) + (minutes * 60) + seconds;
  }
};

window.utils = utils;

// Lucide 브랜드 아이콘 단종 대비 내장 SVG 아이콘
const SVG_ICONS = {
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%; display: block;"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.51c-1.16.315-2.062 1.216-2.11 2.108C0 8.033 0 12 0 12s0 3.967.502 5.837c.048.892.95 1.793 2.11 2.108 1.87.51 9.388.51 9.388.51s7.517 0 9.388-.51c1.16-.315 2.062-1.216 2.11-2.108C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`
};

window.SVG_ICONS = SVG_ICONS;
