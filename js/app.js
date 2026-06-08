// Main Application Entrypoint

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 초기 UI 및 아이콘 로드
  if (window.lucide) {
    lucide.createIcons();
  }

  // API 키 입력 폼 값 설정
  const apiKeyInput = document.getElementById('youtube-api-key-input');
  if (apiKeyInput) {
    apiKeyInput.value = CONFIG.getYoutubeApiKey();
  }

  // 2. 이벤트 바인딩 - 사이드바 토글 및 모바일 오버레이
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
    });
  }

  // 3. 이벤트 바인딩 - 사이드바 메뉴 네비게이션
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const views = document.querySelectorAll('.dashboard-view');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetViewId = item.getAttribute('data-target');
      
      // active 메뉴 클래스 변경
      menuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      
      // 뷰 전환
      views.forEach(v => {
        if (v.id === targetViewId) {
          v.classList.add('active');
        } else {
          v.classList.remove('active');
        }
      });

      // 모바일인 경우 사이드바 닫기
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('mobile-open');
      }

      // 브랜드 비교 차트 활성화 시 Chart.js 차트 리사이즈 트리거
      if (targetViewId === 'view-comparison') {
        setTimeout(() => {
          Object.values(uiRenderer.charts).forEach(chart => chart.resize());
        }, 100);
      }
    });
  });

  // 4. 이벤트 바인딩 - 새로고침 버튼
  const refreshBtn = document.getElementById('refresh-btn');
  const refreshIcon = document.getElementById('refresh-icon');

  const handleRefresh = async (force = false) => {
    if (refreshIcon) refreshIcon.classList.add('spin-loader');
    uiRenderer.renderLoading();
    
    try {
      const data = await dataManager.loadAllData(force);
      uiRenderer.renderDashboard(data, dataManager.state.isMockMode);
      
      // 마지막 업데이트 표시
      updateLastUpdatedText(dataManager.state.lastUpdated);
      uiRenderer.showToast(force ? '데이터를 실시간으로 갱신했습니다!' : '데이터 로드 성공');
    } catch (e) {
      uiRenderer.showToast('데이터 로드 중 오류가 발생했습니다: ' + e.message);
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('spin-loader');
    }
  };

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const lastRefresh = localStorage.getItem('yt_last_live_refresh');
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1시간 = 3,600,000ms
      
      // 마지막 실시간 API 호출 성공 시점으로부터 1시간 이내일 경우 차단
      if (lastRefresh && (now - parseInt(lastRefresh)) < oneHour) {
        const remainingMs = oneHour - (now - parseInt(lastRefresh));
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        uiRenderer.showToast(`실시간 갱신은 1시간에 1회만 가능합니다. (${remainingMinutes}분 후 가능 / 현재 캐시 표시)`);
        
        // API 호출 없이 캐시 데이터를 보여주는 일반 새로고침 수행
        await handleRefresh(false);
      } else {
        // 1시간이 경과했으면 실시간 강제 새로고침 수행
        await handleRefresh(true);
      }
    });
  }

  // 5. 이벤트 바인딩 - 상세 정보 탭 전환 (전체보기 / 브랜드별 보기)
  const tabViewAll = document.getElementById('tab-view-all');
  const tabViewBrand = document.getElementById('tab-view-brand');
  const brandSelect = document.getElementById('detail-brand-select');

  if (tabViewAll && tabViewBrand) {
    const handleTabSwitch = (tabName) => {
      uiRenderer.activeDetailTab = tabName;
      
      if (tabName === 'all') {
        tabViewAll.classList.add('active');
        tabViewBrand.classList.remove('active');
        if (brandSelect) brandSelect.style.display = 'none';
      } else {
        tabViewAll.classList.remove('active');
        tabViewBrand.classList.add('active');
        if (brandSelect) brandSelect.style.display = 'block';
        
        // 브랜드별 보기로 전환 시 디폴트 브랜드가 선택되지 않았다면 첫 번째 브랜드 설정
        if (!uiRenderer.activeBrandId && dataManager.state.combinedData.length > 0) {
          uiRenderer.activeBrandId = dataManager.state.combinedData[0].id;
        }
        if (brandSelect && uiRenderer.activeBrandId) {
          brandSelect.value = uiRenderer.activeBrandId;
        }
      }
      
      uiRenderer.renderDetails();
    };

    tabViewAll.addEventListener('click', () => handleTabSwitch('all'));
    tabViewBrand.addEventListener('click', () => handleTabSwitch('brand'));
  }

  if (brandSelect) {
    brandSelect.addEventListener('change', (e) => {
      uiRenderer.activeBrandId = e.target.value;
      uiRenderer.renderDetails();
    });
  }

  // 6. 이벤트 바인딩 - API 설정 저장 및 삭제 폼
  const settingsForm = document.getElementById('settings-form');
  const clearKeyBtn = document.getElementById('btn-clear-key');

  if (settingsForm && apiKeyInput) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = apiKeyInput.value.trim();
      
      CONFIG.setYoutubeApiKey(key);
      uiRenderer.showToast(key ? 'YouTube API 키가 저장되었습니다.' : 'API 키를 제거했습니다.');
      
      // 새로운 API 키로 데이터 재로드
      await handleRefresh(true);
    });
  }

  if (clearKeyBtn && apiKeyInput) {
    clearKeyBtn.addEventListener('click', async () => {
      CONFIG.setYoutubeApiKey('');
      apiKeyInput.value = CONFIG.getYoutubeApiKey();
      uiRenderer.showToast('사용자 API 키가 초기화되어 기본 내장 API 키로 복원되었습니다.');
      
      // 기본 API 키로 데이터 재로드
      await handleRefresh(true);
    });
  }

  // 헬퍼: 마지막 업데이트 텍스트 포맷 업데이트
  const updateLastUpdatedText = (isoString) => {
    const textEl = document.getElementById('last-updated-text');
    if (!textEl || !isoString) return;
    
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    textEl.textContent = `마지막 업데이트: ${hours}:${minutes}:${seconds}`;
  };

  // 7. 앱 구동 시 초기 데이터 로드 시작
  await handleRefresh(false);
});
