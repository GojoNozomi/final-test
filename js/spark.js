/**
 * 火花功能 - 自由控制重制版
 * 随时修改天数，且修改后依然能在第二天自动 +1
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'chat_streak_data_v2';

  // 自由火花核心数据
  let streakData = {
    baseDays: 0,          // 你手动设定的基础天数
    lastModifiedDate: '', // 你上次修改天数的那一天
    rekindleCount: 0      // 重燃次数
  };

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getDateDiff(date1, date2) {
    const d1 = new Date(date1 + 'T00:00:00');
    const d2 = new Date(date2 + 'T00:00:00');
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function loadStreakData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        streakData = JSON.parse(saved);
      } else {
        // 如果是新号，默认今天开始，0天
        streakData.lastModifiedDate = getTodayStr();
        saveStreakData();
      }
    } catch(e) {}
  }

  function saveStreakData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData));
    } catch(e) {}
  }

  // 🚀 【核心逻辑】：计算今天应该显示的真实天数 = 你设定的基础天数 + (今天 - 你设定的那天)
  function calculateCurrentDays() {
    if (!streakData.lastModifiedDate) {
        streakData.lastModifiedDate = getTodayStr();
        saveStreakData();
    }
    let diff = getDateDiff(streakData.lastModifiedDate, getTodayStr());
    if (diff < 0) diff = 0; // 防止系统时间错乱
    return streakData.baseDays + diff;
  }

  // ========== UI 更新 ==========

  function updateSparkUI() {
    const icon = document.getElementById('spark-icon');
    const badge = document.getElementById('spark-badge');
    if (!icon) return;

    let currentDays = calculateCurrentDays();

    // 只要有天数，火花就永远燃烧！
    if (currentDays > 0) {
      icon.className = 'spark-icon active';
      icon.style.display = 'flex';
      if (badge) {
        badge.textContent = currentDays;
        badge.style.display = 'block';
      }
    } else {
      // 0天的时候不显示数字，但保留图标可以点击修改
      icon.className = 'spark-icon inactive';
      icon.style.display = 'flex';
      if (badge) badge.style.display = 'none';
    }
  }

  // 原本的自动判定逻辑全被架空，现在由老婆大人的心意全权做主
  function recordChat() { updateSparkUI(); }
  function recordPartnerChat() {}

  // ========== 弹窗 (加入上帝修改功能) ==========

  function openSparkModal() {
    const overlay = document.getElementById('spark-modal-overlay');
    if (!overlay) return;

    let currentDays = calculateCurrentDays();

    const flame = document.getElementById('spark-modal-flame');
    const title = document.getElementById('spark-modal-title');
    const subtitle = document.getElementById('spark-modal-subtitle');
    const streakDays = document.getElementById('spark-streak-days');
    const rekindleCount = document.getElementById('spark-rekindle-count');
    const info = document.getElementById('spark-rekindle-info');

    // UI 永远保持最完美的热恋状态
    if (flame) flame.textContent = '🔥';
    title.textContent = '永不熄灭的火花';
    subtitle.textContent = '你们的爱，不随机器的算法而改变。';
    if (info) {
      info.className = 'spark-rekindle-info';
      info.querySelector('.rekindle-text').textContent = '✨ 完美状态';
      info.querySelector('.rekindle-sub').textContent = '点击上方的天数，即可自由修改！';
    }

    // 🚀 让天数变成可点击修改的按钮
    streakDays.innerHTML = `<div style="cursor:pointer; text-decoration:underline dotted; color:var(--accent-color);" title="点击修改天数" onclick="window.SparkApp.editDays()">${currentDays}</div>`;
    rekindleCount.textContent = streakData.rekindleCount;

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
  }

  function closeSparkModal() {
    const overlay = document.getElementById('spark-modal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
    }
  }

  // 🚀 【上帝模式】：自由修改火花天数
  function editDays() {
    let currentDays = calculateCurrentDays();
    let newDays = prompt("✨ 请输入你想显示的火花天数：", currentDays);
    
    if (newDays !== null) {
      let parsedDays = parseInt(newDays, 10);
      if (!isNaN(parsedDays) && parsedDays >= 0) {
        // 重置时间锚点：把今天作为新的起点，基础天数设为你输入的值
        streakData.baseDays = parsedDays;
        streakData.lastModifiedDate = getTodayStr();
        saveStreakData();
        
        // 瞬间刷新 UI
        updateSparkUI();
        openSparkModal(); 
      } else {
        alert("请输入一个有效的数字哦！");
      }
    }
  }

  // ========== 初始化 ==========

  function init() {
    var overlay = document.getElementById('spark-modal-overlay');
    if (overlay && overlay.parentElement && overlay.parentElement.tagName !== 'BODY') {
      document.body.appendChild(overlay);
    }
    loadStreakData();
    updateSparkUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SparkApp = {
    recordChat,
    recordPartnerChat,
    openSparkModal,
    closeSparkModal,
    editDays, // 暴露修改功能
    getData: () => ({ ...streakData })
  };

})();
