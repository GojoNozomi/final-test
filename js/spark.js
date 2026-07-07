/**
 * 火花功能 - 终极自由装饰与双历重制版
 * 支持 Emoji/图片链接，大小、透明度、位置拖拽自由控制
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'chat_custom_spark_v4';

  // 默认挂件与天数配置
  let config = {
    loveBase: 0, 
    loveDate: '',
    dreamBase: 0, 
    dreamDate: '',
    iconVal: '🔥',      // 默认是火花，支持外部 URL
    size: 1.0,        // 大小比例 0.5 - 4.0
    opacity: 1.0,     // 透明度 0.1 - 1.0
    drag: false,      // 是否开启自由摆放
    x: '', y: ''      // 摆放的坐标
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

  function loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        config = { ...config, ...JSON.parse(saved) };
      } else {
        config.loveDate = getTodayStr();
        config.dreamDate = getTodayStr();
        saveConfig();
      }
    } catch(e) {}
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch(e) {}
  }

  function calcDays(base, dateStr) {
    if (!dateStr) return base;
    let diff = getDateDiff(dateStr, getTodayStr());
    if (diff < 0) diff = 0;
    return base + diff;
  }

  // ========== 核心：挂件 UI 渲染 ==========

  function updateIconUI() {
    const icon = document.getElementById('spark-icon');
    const badge = document.getElementById('spark-badge');
    if (!icon) return;

    // 彻底隐藏烦人的小红点计数器，纯粹当装饰
    if (badge) badge.style.display = 'none';

    icon.style.display = 'flex';
    icon.style.justifyContent = 'center';
    icon.style.alignItems = 'center';

    // 智能识别：如果是网址，就变成图片；否则就是 Emoji 文字
    if (config.iconVal.startsWith('http://') || config.iconVal.startsWith('https://')) {
        icon.innerHTML = `<img src="${config.iconVal}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; pointer-events:none;">`;
    } else {
        icon.innerHTML = `<span style="font-size:1.2em; pointer-events:none;">${config.iconVal}</span>`;
    }

    // 缩放与透明度
    icon.style.transform = `scale(${config.size})`;
    icon.style.opacity = config.opacity;

    // 拖拽位置模式
    if (config.drag) {
        icon.style.position = 'fixed';
        icon.style.zIndex = '9999';
        icon.style.cursor = 'grab';
        icon.style.transition = 'none'; // 拖拽时取消动画防卡顿
        if (config.x && config.y) {
            icon.style.left = config.x;
            icon.style.top = config.y;
        } else {
            // 第一次开启拖拽，默认给个位置
            icon.style.left = '50px';
            icon.style.top = '100px';
        }
    } else {
        // 固定在右上角原位
        icon.style.position = '';
        icon.style.left = '';
        icon.style.top = '';
        icon.style.zIndex = '';
        icon.style.cursor = 'pointer';
        icon.style.transition = 'transform 0.2s';
    }
  }

  // ========== 挂件物理拖拽逻辑 ==========

  let isDragging = false;
  let hasMoved = false;
  let startX, startY;
  let initialLeft, initialTop;

  function initDrag() {
    const icon = document.getElementById('spark-icon');
    if (!icon) return;

    // 移除原生写死的 onclick 绑定，由我们全权接管！
    icon.removeAttribute('onclick');

    // 兼容鼠标与触摸
    icon.addEventListener('mousedown', handleDragStart, {passive: false});
    icon.addEventListener('touchstart', handleDragStart, {passive: false});
    document.addEventListener('mousemove', handleDragMove, {passive: false});
    document.addEventListener('touchmove', handleDragMove, {passive: false});
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    // 智能点击判断（防误触）
    icon.addEventListener('click', function(e) {
        if (config.drag && hasMoved) return; // 如果拖拽了，就不弹窗
        openSparkModal(); // 如果只是点了一下，弹出控制台
    });
  }

  function handleDragStart(e) {
    if (!config.drag) return;
    e.preventDefault();
    isDragging = true;
    hasMoved = false;
    let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startX = clientX;
    startY = clientY;
    const rect = document.getElementById('spark-icon').getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
  }

  function handleDragMove(e) {
    if (!isDragging) return;
    let clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    let clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    let dx = clientX - startX;
    let dy = clientY - startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

    const icon = document.getElementById('spark-icon');
    icon.style.left = (initialLeft + dx) + 'px';
    icon.style.top = (initialTop + dy) + 'px';
  }

  function handleDragEnd(e) {
    if (isDragging && hasMoved) {
        const icon = document.getElementById('spark-icon');
        config.x = icon.style.left;
        config.y = icon.style.top;
        saveConfig();
    }
    isDragging = false;
  }

  // ========== UI 弹窗构建 (百分百变色龙注入) ==========

  function openSparkModal() {
    const overlay = document.getElementById('spark-modal-overlay');
    if (!overlay) return;

    // 我们直接重构内部的整个卡片容器，彻底听你的话
    let modalBox = overlay.querySelector('.spark-modal') || overlay.querySelector('div');
    if (!modalBox) return;

    let lDays = calcDays(config.loveBase, config.loveDate);
    let dDays = calcDays(config.dreamBase, config.dreamDate);

    // 强行换皮，跟随系统 var
    modalBox.style.background = 'var(--primary-bg)';
    modalBox.style.color = 'var(--text-primary)';
    modalBox.style.border = '1px solid var(--border-color)';
    modalBox.style.borderRadius = '16px';
    modalBox.style.padding = '20px';

    modalBox.innerHTML = `
      <div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:15px; color:var(--text-primary);">
        ✨ 专属装饰与双历
      </div>

      <div style="display:flex; justify-content:space-around; background:rgba(var(--accent-color-rgb), 0.08); border:1px solid var(--accent-color); border-radius:12px; padding:15px; margin-bottom:20px;">
          <div style="text-align:center; flex:1;">
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:6px;">恋爱天数</div>
              <div onclick="window.SparkApp.editLove()" style="cursor:pointer; text-decoration:underline dotted var(--accent-color); color:var(--accent-color); font-size:26px; font-weight:bold; display:inline-block; padding:0 10px;">${lDays}</div>
          </div>
          <div style="width:1px; background:var(--accent-color); opacity:0.3; margin:0 10px;"></div>
          <div style="text-align:center; flex:1;">
              <div style="font-size:12px; color:var(--text-secondary); margin-bottom:6px;">入梦天数</div>
              <div onclick="window.SparkApp.editDream()" style="cursor:pointer; text-decoration:underline dotted var(--accent-color); color:var(--accent-color); font-size:26px; font-weight:bold; display:inline-block; padding:0 10px;">${dDays}</div>
          </div>
      </div>

      <div style="border-top:1px dashed var(--border-color); padding-top:15px; text-align:left;">
          <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:10px;"><i class="fas fa-magic"></i> 挂件控制台</div>
          
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:6px;">更换图标 (支持 Emoji 或 图片链接)</div>
          <div style="display:flex; gap:8px; margin-bottom:15px;">
              <input id="custom-icon-input" value="${config.iconVal}" placeholder="🔥 或 https://..." style="flex:1; padding:8px; background:var(--primary-bg); color:var(--text-primary); border:1px solid var(--border-color); border-radius:6px; font-size:12px; outline:none;">
              <button onclick="window.SparkApp.saveIcon()" style="background:var(--accent-color); color:#fff; border:none; border-radius:6px; padding:0 12px; font-size:12px; cursor:pointer;">应用</button>
          </div>

          <div style="display:flex; align-items:center; gap:10px; font-size:12px; color:var(--text-secondary); margin-bottom:15px;">
              <span style="width:40px; font-weight:bold;">缩放</span>
              <input type="range" min="0.5" max="4.0" step="0.1" value="${config.size}" style="flex:1; accent-color:var(--accent-color);" oninput="window.SparkApp.liveScale(this.value)" onchange="window.SparkApp.saveScale(this.value)">
          </div>

          <div style="display:flex; align-items:center; gap:10px; font-size:12px; color:var(--text-secondary); margin-bottom:15px;">
              <span style="width:40px; font-weight:bold;">透明</span>
              <input type="range" min="0.1" max="1.0" step="0.1" value="${config.opacity}" style="flex:1; accent-color:var(--accent-color);" oninput="window.SparkApp.liveOpacity(this.value)" onchange="window.SparkApp.saveOpacity(this.value)">
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px; color:var(--text-primary); margin-bottom:5px; background:rgba(0,0,0,0.03); padding:10px; border-radius:8px;">
              <span style="font-weight:bold;">开启自由拖拽摆放</span>
              <label class="dm-toggle-pill"><input type="checkbox" ${config.drag ? 'checked' : ''} onchange="window.SparkApp.toggleDrag(this.checked)"><span class="dm-toggle-slider" style="background:var(--accent-color);"></span></label>
          </div>
      </div>

      <button onclick="window.SparkApp.closeSparkModal()" style="width:100%; margin-top:15px; padding:12px; background:transparent; color:var(--text-primary); border:1px solid var(--border-color); border-radius:8px; cursor:pointer; font-weight:bold;">完成</button>
    `;

    overlay.style.display = 'flex';
    // 兼容原版的淡入动画
    setTimeout(() => { overlay.style.opacity = '1'; overlay.style.visibility = 'visible'; }, 10);
  }

  function closeSparkModal() {
    const overlay = document.getElementById('spark-modal-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
  }

  // ========== 控制交互方法 ==========

  function editLove() {
    let current = calcDays(config.loveBase, config.loveDate);
    let val = prompt("✨ 请输入【恋爱天数】起算：", current);
    if (val !== null && !isNaN(parseInt(val))) {
      config.loveBase = parseInt(val);
      config.loveDate = getTodayStr();
      saveConfig();
      openSparkModal(); 
    }
  }

  function editDream() {
    let current = calcDays(config.dreamBase, config.dreamDate);
    let val = prompt("✨ 请输入【入梦天数】起算：", current);
    if (val !== null && !isNaN(parseInt(val))) {
      config.dreamBase = parseInt(val);
      config.dreamDate = getTodayStr();
      saveConfig();
      openSparkModal(); 
    }
  }

  function saveIcon() {
    const inp = document.getElementById('custom-icon-input');
    if (inp) {
      config.iconVal = inp.value.trim() || '🔥';
      saveConfig();
      updateIconUI();
    }
  }

  function liveScale(val) {
    const icon = document.getElementById('spark-icon');
    if (icon) icon.style.transform = `scale(${val})`;
  }
  function saveScale(val) {
    config.size = parseFloat(val);
    saveConfig();
  }

  function liveOpacity(val) {
    const icon = document.getElementById('spark-icon');
    if (icon) icon.style.opacity = val;
  }
  function saveOpacity(val) {
    config.opacity = parseFloat(val);
    saveConfig();
  }

  function toggleDrag(checked) {
    config.drag = checked;
    saveConfig();
    updateIconUI();
  }

  // 保留原版防止报错的方法壳子
  function recordChat() {}
  function recordPartnerChat() {}

  // ========== 初始化 ==========
  function init() {
    var overlay = document.getElementById('spark-modal-overlay');
    if (overlay && overlay.parentElement && overlay.parentElement.tagName !== 'BODY') {
      document.body.appendChild(overlay);
    }
    loadConfig();
    initDrag();
    updateIconUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SparkApp = {
    recordChat, recordPartnerChat,
    openSparkModal, closeSparkModal,
    editLove, editDream,
    saveIcon, liveScale, saveScale, liveOpacity, saveOpacity, toggleDrag
  };

})();
