// UI Renderer Module

const uiRenderer = {
  activeBrandId: null,
  activeDetailTab: 'all', // 'all' 또는 'brand'
  charts: {},

  // 1. 토스트 알림 표시
  showToast: (message, duration = 3000) => {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  // 2. 스켈레톤 로딩 상태 렌더링
  renderLoading: () => {
    const grid = document.getElementById('brand-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      grid.innerHTML += `
        <div class="card skeleton" style="height: 250px;"></div>
      `;
    }
    
    // 차트 영역 숨김
    const chartsContainer = document.getElementById('comparison-charts');
    if (chartsContainer) chartsContainer.style.opacity = '0.3';
    
    // 상세 영역 숨김
    const detailContainer = document.getElementById('brand-detail-section');
    if (detailContainer) detailContainer.classList.remove('active');
  },

  // 3. 카드 및 대시보드 메인 뷰 렌더링
  renderDashboard: (data, isMockMode) => {
    const grid = document.getElementById('brand-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const chartsContainer = document.getElementById('comparison-charts');
    if (chartsContainer) chartsContainer.style.opacity = '1';
    
    // 모드 뱃지 표시
    const modeBadge = document.getElementById('api-mode-badge');
    if (modeBadge) {
      if (isMockMode) {
        modeBadge.className = 'badge badge-shorts';
        modeBadge.textContent = 'MOCK MODE';
        modeBadge.title = 'YouTube API 키가 없습니다. 샘플 데이터를 표시합니다.';
      } else {
        modeBadge.className = 'badge badge-post';
        modeBadge.textContent = 'LIVE API';
        modeBadge.title = '실시간 YouTube API 데이터를 표시합니다.';
      }
    }

    data.forEach(brand => {
      const card = document.createElement('div');
      card.className = 'card animate-fade-in';
      card.style.setProperty('--brand-color', brand.color);
      card.style.setProperty('--brand-color-rgb', brand.colorRgb);
      
      // 활성화 상태 표시
      if (uiRenderer.activeBrandId === brand.id) {
        card.classList.add('active-card');
        card.style.boxShadow = `0 12px 40px 0 rgba(0, 0, 0, 0.4), 0 0 15px 2px rgba(${brand.colorRgb}, 0.25)`;
        card.style.borderColor = `rgba(${brand.colorRgb}, 0.5)`;
      }

      const totalYt7Days = brand.youtube.videoCount7Days + brand.youtube.shortsCount7Days;

      card.innerHTML = `
        <div class="card-header">
          <div class="brand-info">
            <img class="brand-card-logo" src="${brand.logo}" alt="${brand.name}" style="width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.12); object-fit: cover;">
            <span style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-left: 8px; text-transform: uppercase;">${brand.name}</span>
          </div>
          <div class="sns-badge-container" style="display: flex; align-items: center; gap: 10px;">
            <a href="${brand.youtube.url}" target="_blank" class="sns-badge youtube active" title="YouTube 채널 바로가기" style="width: 20px; height: 20px; display: block;">
              ${SVG_ICONS.youtube}
            </a>
          </div>
        </div>
        
        <div class="card-metrics-grid">
          <div class="metric-box">
            <div class="metric-label" style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 14px; height: 14px; color: var(--color-youtube); display: block;">${SVG_ICONS.youtube}</span> 구독자수
            </div>
            <div class="metric-val" style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
              <span>${utils.formatNumber(brand.youtube.subscriberCount)}</span>
              ${uiRenderer.changeBadge(brand.youtube.subscriberChange)}
            </div>
            <div class="metric-sub">총 동영상: ${brand.youtube.videoCount.toLocaleString()}개</div>
          </div>
          
          <div class="metric-box">
            <div class="metric-label" style="display: flex; align-items: center; gap: 6px;">
              <span style="width: 14px; height: 14px; color: var(--color-youtube); display: block;">${SVG_ICONS.youtube}</span> 최근 업로드 (7일)
            </div>
            <div class="metric-val" style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
              <span>${totalYt7Days}개</span>
            </div>
            <div class="metric-sub">영상: ${brand.youtube.videoCount7Days} / 쇼츠: ${brand.youtube.shortsCount7Days}</div>
          </div>
        </div>
        
        <div class="card-footer">
          <span>최근 7일 새 동영상: <strong>${totalYt7Days}개</strong></span>
          <span class="card-action-txt">상세 보기 <i data-lucide="chevron-right" style="width: 14px; height: 14px"></i></span>
        </div>
      `;

      card.addEventListener('click', () => {
        uiRenderer.selectBrand(brand.id, data);
      });

      grid.appendChild(card);
    });

    // 렌더링 후 아이콘 활성화
    if (window.lucide) {
      lucide.createIcons();
    }

    // 차트 그리기
    uiRenderer.renderCharts(data);

    // 브랜드 셀렉트 드롭다운 옵션 채우기
    const selectEl = document.getElementById('detail-brand-select');
    if (selectEl) {
      selectEl.innerHTML = data.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    // 디폴트 상세 보기 렌더링 (전체보기 상태 유지)
    if (!uiRenderer.activeBrandId && data.length > 0) {
      uiRenderer.activeBrandId = data[0].id;
    }
    uiRenderer.renderDetails();
  },

  // 4. 브랜드 선택 처리
  selectBrand: (brandId, data) => {
    uiRenderer.activeBrandId = brandId;
    
    // 카드 활성화 보더 리셋 및 설정
    const cardElements = document.getElementById('brand-grid').children;
    data.forEach((b, idx) => {
      const cardEl = cardElements[idx];
      if (!cardEl || cardEl.classList.contains('skeleton')) return;
      
      if (b.id === brandId) {
        cardEl.style.boxShadow = `0 12px 40px 0 rgba(0, 0, 0, 0.4), 0 0 15px 2px rgba(${b.colorRgb}, 0.25)`;
        cardEl.style.borderColor = `rgba(${b.colorRgb}, 0.5)`;
      } else {
        cardEl.style.boxShadow = '';
        cardEl.style.borderColor = '';
      }
    });

    // 상세 정보 패널 활성화
    const detailContainer = document.getElementById('brand-detail-section');
    if (detailContainer) {
      detailContainer.classList.add('active');
      setTimeout(() => {
        detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }

    // 브랜드별 보기 탭으로 자동 전환 및 드롭다운 동기화
    uiRenderer.activeDetailTab = 'brand';
    
    const tabAll = document.getElementById('tab-view-all');
    const tabBrand = document.getElementById('tab-view-brand');
    const brandSelect = document.getElementById('detail-brand-select');
    
    if (tabAll && tabBrand) {
      tabAll.classList.remove('active');
      tabBrand.classList.add('active');
    }
    if (brandSelect) {
      brandSelect.style.display = 'block';
      brandSelect.value = brandId;
    }

    uiRenderer.renderDetails();
  },

  // 미디어 아이템 HTML 빌더 헬퍼
  buildMediaItemHtml: (item, platform) => {
    if (platform === 'youtube') {
      return `
        <div class="media-item animate-fade-in">
          <span class="platform-indicator youtube" title="YouTube">${SVG_ICONS.youtube}</span>
          <div class="media-thumbnail-container">
            <img class="media-thumbnail" src="${item.thumbnail}" alt="${item.title}">
            <span class="media-duration">${item.duration}</span>
          </div>
          <div class="media-info">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="badge ${item.isShorts ? 'badge-shorts' : 'badge-video'}">${item.isShorts ? 'Shorts' : 'Video'}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${utils.getRelativeTime(item.publishedAt)}</span>
              </div>
              <div class="media-title" title="${item.title}">${item.title}</div>
              <div class="media-desc">${item.description || '내용 설명이 없습니다.'}</div>
            </div>
            <div class="media-meta">
              <span><i data-lucide="eye" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${utils.formatNumber(item.views)}회 조회</span>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="media-item animate-fade-in">
          <span class="platform-indicator instagram" title="Instagram">${SVG_ICONS.instagram}</span>
          <div class="media-thumbnail-container">
            <img class="media-thumbnail" src="${item.mediaUrl}" alt="Instagram Post">
          </div>
          <div class="media-info">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge ${item.type === 'reel' ? 'badge-reel' : 'badge-post'}">${item.type === 'reel' ? 'Reel' : 'Post'}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${utils.getRelativeTime(item.timestamp)}</span>
              </div>
              <div class="media-desc" style="-webkit-line-clamp: 3; font-size: 0.85rem; margin-bottom: 8px; color: var(--text-primary);">${item.caption}</div>
            </div>
            <div class="media-meta">
              <span><i data-lucide="heart" style="width: 12px; height: 12px; color: var(--color-danger); display: inline-block; vertical-align: middle;"></i> ${utils.formatNumber(item.likes)}</span>
              <span><i data-lucide="message-circle" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${utils.formatNumber(item.comments)}</span>
            </div>
          </div>
        </div>
      `;
    }
  },

  // 5. 선택된 브랜드 상세 내역 렌더링 (YouTube 전용)
  renderDetails: () => {
    const listContainer = document.getElementById('detail-list');
    const titleText = document.getElementById('detail-title-text');
    const logoContainer = document.getElementById('detail-brand-logo-container');
    
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    const data = dataManager.state.combinedData;
    if (!data || data.length === 0) return;
    
    if (uiRenderer.activeDetailTab === 'all') {
      // 1. 전체보기 모드
      if (titleText) titleText.textContent = '전체 브랜드 YouTube 최근 콘텐츠 (지난 7일)';
      if (logoContainer) logoContainer.innerHTML = '';
      
      // 사용자 지정 순서: dewalt, stanley, milwaukee, bosch, makita, keyang, festool
      const brandOrder = ['dewalt', 'stanley', 'milwaukee', 'bosch', 'makita', 'keyang', 'festool'];
      
      brandOrder.forEach(brandId => {
        const brand = data.find(b => b.id === brandId);
        if (!brand) return;
        
        const ytCount = brand.youtube.recentVideos.length;
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'brand-group-section';
        groupDiv.style.marginBottom = '32px';
        groupDiv.style.borderBottom = '1px dashed var(--border-color)';
        groupDiv.style.paddingBottom = '24px';
        
        // 그룹 헤더 (원형 로고 + 브랜드 이름 + YouTube 아이콘)
        let headerHtml = `
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${brand.logo}" alt="${brand.name}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); object-fit: cover;">
              <span style="font-weight: 750; font-size: 1rem; color: ${brand.color}; text-transform: uppercase; letter-spacing: 0.5px;">${brand.name}</span>
              <span style="width: 14px; height: 14px; color: var(--color-youtube); display: inline-block; vertical-align: middle;">${SVG_ICONS.youtube}</span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">최근 영상 ${ytCount}개</span>
          </div>
        `;
        
        let itemsHtml = '<div style="display: flex; flex-direction: column; gap: 12px;">';
        
        if (ytCount === 0) {
          itemsHtml += `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">지난 7일간 새로 업로드된 YouTube 영상이 없습니다.</div>`;
        } else {
          brand.youtube.recentVideos.forEach(video => {
            itemsHtml += uiRenderer.buildMediaItemHtml(video, 'youtube');
          });
        }
        
        itemsHtml += '</div>';
        
        groupDiv.innerHTML = headerHtml + itemsHtml;
        listContainer.appendChild(groupDiv);
      });
      
    } else {
      // 2. 브랜드별 보기 모드
      const brandId = uiRenderer.activeBrandId || (data.length > 0 ? data[0].id : null);
      if (!brandId) return;
      
      const brand = data.find(b => b.id === brandId);
      if (!brand) return;
      
      if (titleText) titleText.textContent = `${brand.name} YouTube 최근 콘텐츠 (지난 7일)`;
      if (logoContainer) {
        logoContainer.innerHTML = `<img src="${brand.logo}" alt="${brand.name}" style="height: 24px; width: 24px; border-radius: 50%; vertical-align: middle; margin-right: 4px; object-fit: cover;">`;
      }
      
      const hasYoutube = brand.youtube.recentVideos.length > 0;
      
      if (!hasYoutube) {
        listContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);">지난 7일간 업로드된 새로운 YouTube 영상이 없습니다.</div>`;
        return;
      }
      
      // YouTube 그룹 추가
      const ytGroup = document.createElement('div');
      ytGroup.className = 'platform-group';
      
      let ytItemsHtml = '';
      brand.youtube.recentVideos.forEach(video => {
        ytItemsHtml += uiRenderer.buildMediaItemHtml(video, 'youtube');
      });
      
      ytGroup.innerHTML = `
        <h4 class="platform-group-title youtube">
          <span class="platform-icon">${SVG_ICONS.youtube}</span> YouTube 최근 업로드
        </h4>
        <div class="platform-items">
          ${ytItemsHtml}
        </div>
      `;
      listContainer.appendChild(ytGroup);
    }
    
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  // 구독자 증감 배지: 일별 기록이 N일 이상 쌓였을 때만 표시 (실제 기록 비교)
  changeBadge: (chg) => {
    if (!chg) return '';
    const { change, days, since } = chg;
    const color = change > 0 ? 'var(--color-success)' : change < 0 ? 'var(--color-danger)' : 'var(--text-muted)';
    const sign = change > 0 ? '+' : change < 0 ? '−' : '±';
    const tip = `${since} 기록 대비 (${days}일). YouTube API는 구독자 수를 반올림해 제공하므로 10~100명 단위로 바뀝니다.`;
    return `<span title="${tip}" style="font-size: 0.72rem; font-weight: 600; color: ${color};">${sign}${Math.abs(change).toLocaleString()}명 <span style="font-weight: 400; opacity: 0.75;">(${days}일)</span></span>`;
  },

  // 6. 차트 초기화 및 렌더링
  renderCharts: (data) => {
    // Chart.js 테마 및 디폴트 설정
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const brandNames = data.map(b => b.name);
    const brandColors = data.map(b => b.color);
    
    // 차트 1: 구독자 비교 (YouTube)
    const ytSubscribers = data.map(b => b.youtube.subscriberCount);
    uiRenderer.drawBarChart('chart-yt-subs', brandNames, ytSubscribers, brandColors, 'YouTube 구독자 수');

    // 차트 2: 채널 총 동영상 수 비교 (YouTube)
    const ytTotalVideos = data.map(b => b.youtube.videoCount);
    uiRenderer.drawBarChart('chart-yt-vids', brandNames, ytTotalVideos, brandColors, 'YouTube 총 동영상 수');

    // 차트 3: 최근 7일 업로드 활동량 비교 (유튜브 영상 & 쇼츠)
    const ytVideos = data.map(b => b.youtube.videoCount7Days);
    const ytShorts = data.map(b => b.youtube.shortsCount7Days);

    uiRenderer.drawActivityChart('chart-activities', brandNames, {
      'YouTube 비디오': ytVideos,
      'YouTube 쇼츠': ytShorts
    });
  },

  // 바 차트 유틸리티
  drawBarChart: (canvasId, labels, dataset, colors, labelName) => {
    if (uiRenderer.charts[canvasId]) {
      uiRenderer.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    uiRenderer.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: labelName,
          data: dataset,
          backgroundColor: colors.map(c => c + 'cc'), // 80% opacity
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y', // 수평 바 차트
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              display: true
            },
            ticks: {
              callback: function(value) {
                return utils.formatNumber(value);
              }
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  },

  // 활동량 비교 그룹 차트
  drawActivityChart: (canvasId, labels, dataGroups) => {
    if (uiRenderer.charts[canvasId]) {
      uiRenderer.charts[canvasId].destroy();
    }

    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    uiRenderer.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'YouTube 비디오',
            data: dataGroups['YouTube 비디오'],
            backgroundColor: '#3b82f6cc', // electric blue
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'YouTube 쇼츠',
            data: dataGroups['YouTube 쇼츠'],
            backgroundColor: '#ef4444cc', // youtube red
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            stacked: false,
            grid: {
              display: true
            },
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
};

window.uiRenderer = uiRenderer;
