document.addEventListener('DOMContentLoaded', async () => {
    const loaderBar = document.getElementById('loader-tech-bar');
    const welcomeSubtitle = document.querySelector('.welcome-subtitle-scramble');
    const welcomeScreen = document.getElementById('welcome-animation');
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const acceptDisclaimerBtn = document.getElementById('accept-disclaimer');

    const updateLoader = (text, width) => {
        if (welcomeSubtitle) welcomeSubtitle.textContent = text;
        if (loaderBar) loaderBar.style.width = width;
    };

    const hideWelcomeScreen = () => {
        if (!welcomeScreen) return;
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
            // 加载动画结束后显示主页
            if (typeof window.showHomePage === 'function') {
                window.showHomePage();
            }
        }, 800);
    };

    const safeAwait = async (promise, fallback = null) => {
        try {
            return await promise;
        } catch (error) {
            console.error('操作失败:', error);
            return fallback;
        }
    };

    try {
        try { setupEventListeners?.(); } catch(e) { console.error('setupEventListeners:', e); }

        if (typeof localforage === 'undefined') {
            console.warn('LocalForage 未加载，将使用 localStorage 降级方案');
        }

        try {
            const emergencyBackupRaw = localStorage.getItem('BACKUP_V1_critical');
            if (emergencyBackupRaw) {
                const emergencyBackup = JSON.parse(emergencyBackupRaw);
                if (emergencyBackup && Array.isArray(emergencyBackup.messages) && emergencyBackup.messages.length > 0) {
                    console.warn('[boot] 检测到紧急备份，可用于异常恢复');
                }
            }
        } catch (e) {
            console.warn('[boot] 紧急备份检查失败:', e);
        }

        updateLoader('正在建立安全连接...', '10%');
        await safeAwait(initializeSession());

        updateLoader('正在读取记忆存档...', '40%');
        await safeAwait(loadData());

        updateLoader('正在渲染我们的世界...', '70%');
        
        await Promise.allSettled([
            safeAwait(initializeRandomUI?.())
        ]);

        setInterval(checkStatusChange, 60000);

        if (disclaimerModal) {
            const tourSeen = await safeAwait(localforage?.getItem(APP_PREFIX + 'tour_seen'), false);
            
            if (!tourSeen) {
                showModal(disclaimerModal);
                
                if (acceptDisclaimerBtn && !acceptDisclaimerBtn._bound) {
                    acceptDisclaimerBtn._bound = true;
                    acceptDisclaimerBtn.addEventListener('click', () => {
                        hideModal(disclaimerModal);
                        localforage?.setItem(APP_PREFIX + 'tour_seen', true).catch(() => {});
                        startTour?.();
                    }, { once: true });
                }
            }
        }

        updateLoader('连接成功，欢迎回来。', '100%');
        setTimeout(hideWelcomeScreen, 3500);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                try {
                    if (typeof saveTimeout !== 'undefined') clearTimeout(saveTimeout);
                } catch (e) {}
                try { _backupCriticalData(); } catch (e) { console.warn('[visibilitychange] 紧急备份失败:', e); }
                try {
                    const p = saveData();
                    if (p && typeof p.catch === 'function') {
                        p.catch(e => console.error('[visibilitychange] 保存失败:', e));
                    }
                } catch (e) {
                    console.error('[visibilitychange] 保存失败:', e);
                }
            } else if (document.visibilityState === 'visible') {
                try {
                    const backup = typeof _tryRecoverFromBackup === 'function' ? _tryRecoverFromBackup() : null;
                    if (backup && Array.isArray(backup.messages) && backup.messages.length > 0 && Array.isArray(messages) && backup.messages.length > messages.length) {
                        console.warn('[visibilitychange] 检测到备份消息比当前更多，自动尝试恢复');
                        try {
                            messages = backup.messages.map(m => ({
                                ...m,
                                timestamp: new Date(m.timestamp)
                            }));
                            if (backup.settings) Object.assign(settings, backup.settings);
                            if (typeof updateUI === 'function') updateUI();
                            if (typeof throttledSaveData === 'function') throttledSaveData();
                            showNotification('已自动恢复本地临时备份内容', 'warning', 3500);
                        } catch (restoreErr) {
                            console.warn('[visibilitychange] 自动恢复失败，保留当前页面内容:', restoreErr);
                        }
                    }
                } catch (e) {
                    console.warn('[visibilitychange] 恢复备份失败:', e);
                }
            }
        });

        window.addEventListener('pagehide', () => {
            try { _backupCriticalData(); } catch (e) {}
        });

        window.addEventListener('beforeunload', () => {
            try { _backupCriticalData(); } catch (e) {}
        });

        setInterval(() => {
            saveData().catch(e => console.warn('[autoBackup] 定时保存失败:', e));
        }, 3 * 60 * 1000);

        (() => {
            const REMIND_KEY = 'exportReminderLastShown';
            const last = parseInt(localStorage.getItem(REMIND_KEY) || '0', 10);
            const daysSince = (Date.now() - last) / (1000 * 60 * 60 * 24);
            if (daysSince >= 7) {
                setTimeout(() => {
                    showNotification('建议定期导出备份，防止数据意外丢失', 'info', 7000);
                    localStorage.setItem(REMIND_KEY, String(Date.now()));
                }, 8000);
            }
        })();

        setTimeout(async () => {
            if ('Notification' in window && Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        showNotification('已开启系统通知，收到消息时会提醒你', 'success', 3000);
                    }
                } catch(e) {
                    console.warn('通知权限请求失败:', e);
                }
            }
        }, 3000);

    } catch (err) {
        console.error('严重初始化错误:', err);
        try {
            const backup = typeof _tryRecoverFromBackup === 'function' ? _tryRecoverFromBackup() : null;
            if (backup && Array.isArray(backup.messages) && backup.messages.length > 0) {
                messages = backup.messages.map(m => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                }));
                if (backup.settings) Object.assign(settings, backup.settings);
                if (typeof updateUI === 'function') updateUI();
                showNotification('初始化异常，已使用本地紧急备份恢复', 'warning', 5000);
            }
        } catch (recoverErr) {
            console.warn('[boot] 初始化失败后的恢复也失败:', recoverErr);
        }
        updateLoader('加载遇到问题，已强制进入...', '100%');
        setTimeout(hideWelcomeScreen, 3500);
    }
});

// 🚀 改造 1：全局回复表情库暴力劫持为外链
const stickerInput = document.getElementById('sticker-file-input');
if (stickerInput) {
    stickerInput.addEventListener('click', async (e) => {
        e.preventDefault(); 
        const url = prompt("🔗 【外链零内存模式】\n请粘贴表情包的图片直链 (URL)：\n(提示: 去微博/小红书/图床右键复制图片地址)");
        
        if (url && url.trim()) {
            const cleanUrl = url.trim();
            stickerLibrary.push(cleanUrl); 
            window._stickerLibrary = stickerLibrary;
            
            try { window.dispatchEvent(new CustomEvent('stickerLibraryUpdated', { detail: { count: stickerLibrary.length } })); } catch(err) {}
            if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
            if (typeof showNotification === 'function') showNotification('✓ 外链表情包添加成功！0 内存消耗！', 'success');
        }
    });
}

// 🚀 改造 2：我的表情快捷栏暴力劫持为外链
const myStickerQuickUpload = document.getElementById('my-sticker-quick-upload');
if (myStickerQuickUpload) {
    myStickerQuickUpload.addEventListener('click', async (e) => {
        e.preventDefault(); 
        const url = prompt("🔗 【我的外链表情包】\n请粘贴图片直链 (URL)：");
        
        if (url && url.trim()) {
            const cleanUrl = url.trim();
            myStickerLibrary.push(cleanUrl);
            
            if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof renderComboContent === 'function') renderComboContent('my-sticker');
            if (typeof showNotification === 'function') showNotification('✓ 已添加外链表情到快捷栏！', 'success');
        }
    });
}

window.addEventListener('load', function() {
    setTimeout(function() {
        try {
            if (localStorage.getItem('dailyGreetingShown') === new Date().toDateString()) return;
            try { if (typeof checkPartnerDailyMood === 'function') checkPartnerDailyMood(); } catch(e2) { console.warn('checkPartnerDailyMood error:', e2); }
            if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
            if (window.localforage && window.APP_PREFIX) {
                localforage.getItem(window.APP_PREFIX + 'tour_seen').then(function(seen) {
                    if (seen) {
                        var modal = document.getElementById('daily-greeting-modal');
                        if (modal) modal.classList.remove('hidden');
                        localStorage.setItem('dailyGreetingShown', new Date().toDateString());
                    }
                }).catch(function() {
                    var modal = document.getElementById('daily-greeting-modal');
                    if (modal) modal.classList.remove('hidden');
                    localStorage.setItem('dailyGreetingShown', new Date().toDateString());
                });
            } else {
                var modal = document.getElementById('daily-greeting-modal');
                if (modal) modal.classList.remove('hidden');
                localStorage.setItem('dailyGreetingShown', new Date().toDateString());
            }
        } catch(e) { console.warn('Daily greeting timing error:', e); }
    }, 4500);
}, { once: true });

(function() {
    var MY_SYM_KEY   = 'pokeSym_my';
    var PTR_SYM_KEY  = 'pokeSym_partner';
    var MY_CUST_KEY  = 'pokeSym_my_custom';
    var PTR_CUST_KEY = 'pokeSym_partner_custom';

    var PRESETS = [
        { value: 'none',    label: '无装饰',   sym: '' },
        { value: 'star4',   label: '✦ 四角星', sym: '✦' },
        { value: 'star5',   label: '✧ 镂空星', sym: '✧' },
        { value: 'dot',     label: '· 圆点',   sym: '·' },
        { value: 'wave',    label: '～ 波浪',  sym: '～' },
        { value: 'heart',   label: '♡ 爱心',   sym: '♡' },
        { value: 'flower',  label: '✿ 花朵',   sym: '✿' },
        { value: 'sparkle', label: '✨ 闪光',  sym: '✨' },
        { value: 'custom',  label: '自定义…',  sym: null }
    ];

    function _getSym(key, customKey) {
        var v = localStorage.getItem(key) || 'star4';
        if (v === 'custom') return localStorage.getItem(customKey) || '✦';
        var p = PRESETS.find(function(x){ return x.value === v; });
        return p ? p.sym : '✦';
    }

    function _stripEmojiForPoke(text) {
        return String(text || '')
            .replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    window._formatPokeText = function(text) {
        var sym = _getSym(MY_SYM_KEY, MY_CUST_KEY);
        return sym ? (sym + ' ' + text + ' ' + sym) : text;
    };
    window._formatPartnerPokeText = function(text) {
        var sym = _getSym(PTR_SYM_KEY, PTR_CUST_KEY);
        return sym ? (sym + ' ' + text + ' ' + sym) : text;
    };
    window._sanitizePokeTextForDisplay = _stripEmojiForPoke;

    function _esc(s) {
        return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    window._openPokeSymSettings = function() {
        var old = document.getElementById('poke-sym-modal');
        if (old) old.remove();

        var mySel    = localStorage.getItem(MY_SYM_KEY) || 'star4';
        var ptrSel   = localStorage.getItem(PTR_SYM_KEY) || 'star4';
        var myCustom = localStorage.getItem(MY_CUST_KEY) || '';
        var ptrCustom= localStorage.getItem(PTR_CUST_KEY) || '';

        function opts(sel) {
            return PRESETS.map(function(p){
                return '<option value="'+p.value+'"'+(sel===p.value?' selected':'')+'>'+p.label+'</option>';
            }).join('');
        }

        var wrap = document.createElement('div');
        wrap.id = 'poke-sym-modal';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);';
        wrap.innerHTML = [
            '<div style="background:var(--primary-bg);border-radius:20px;padding:22px 20px;width:min(340px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.28);border:1px solid var(--border-color);">',
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">',
                '<span style="font-size:15px;font-weight:700;color:var(--text-primary);font-family:var(--font-family);">戳一戳装饰符号</span>',
                '<button id="psm-close" style="background:none;border:none;font-size:18px;color:var(--text-secondary);cursor:pointer;padding:2px 6px;border-radius:6px;">✕</button>',
              '</div>',
              '<div style="font-size:11px;color:var(--text-secondary);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px;">我发出的</div>',
              '<select id="psm-my" style="width:100%;padding:9px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);margin-bottom:8px;">'+opts(mySel)+'</select>',
              '<div id="psm-my-cw" style="margin-bottom:12px;display:'+(mySel==='custom'?'block':'none')+';">',
                '<input id="psm-my-ci" type="text" maxlength="4" placeholder="输入 1-2 个字符" value="'+_esc(myCustom)+'" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;font-family:var(--font-family);">',
              '</div>',
              '<div style="font-size:11px;color:var(--text-secondary);font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px;">对方发出的</div>',
              '<select id="psm-ptr" style="width:100%;padding:9px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;font-family:var(--font-family);margin-bottom:8px;">'+opts(ptrSel)+'</select>',
              '<div id="psm-ptr-cw" style="margin-bottom:14px;display:'+(ptrSel==='custom'?'block':'none')+';">',
                '<input id="psm-ptr-ci" type="text" maxlength="4" placeholder="输入 1-2 个字符" value="'+_esc(ptrCustom)+'" style="width:100%;padding:8px 10px;border:1.5px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;font-family:var(--font-family);">',
              '</div>',
              '<div id="psm-preview" style="background:var(--secondary-bg);border-radius:10px;padding:10px 14px;font-size:12.5px;color:var(--text-secondary);margin-bottom:16px;border:1px dashed var(--border-color);line-height:1.7;"></div>',
              '<div style="display:flex;gap:8px;">',
                '<button id="psm-cancel" style="flex:1;padding:9px;border:1px solid var(--border-color);border-radius:10px;background:var(--secondary-bg);color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>',
                '<button id="psm-save" style="flex:2;padding:9px;border:none;border-radius:10px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-family);">保存</button>',
              '</div>',
            '</div>'
        ].join('');
        document.body.appendChild(wrap);

        function preview() {
            var mv = document.getElementById('psm-my').value;
            var pv = document.getElementById('psm-ptr').value;
            var ms = mv==='custom'?(document.getElementById('psm-my-ci').value||'✦'):((PRESETS.find(function(x){return x.value===mv;})||{}).sym||'');
            var ps = pv==='custom'?(document.getElementById('psm-ptr-ci').value||'✦'):((PRESETS.find(function(x){return x.value===pv;})||{}).sym||'');
            var myN  = (typeof settings!=='undefined'&&settings.myName)||'我';
            var pN   = (typeof settings!=='undefined'&&settings.partnerName)||'对方';
            var mt   = ms?(ms+' '+myN+' 拍了拍你 '+ms):(myN+' 拍了拍你');
            var pt   = ps?(ps+' '+pN+' 拍了拍你 '+ps):(pN+' 拍了拍你');
            document.getElementById('psm-preview').innerHTML =
                '<div style="color:var(--text-primary);">我：'+_esc(mt)+'</div>'+
                '<div style="color:var(--text-primary);margin-top:3px;">对方：'+_esc(pt)+'</div>';
        }

        document.getElementById('psm-my').addEventListener('change', function(){
            document.getElementById('psm-my-cw').style.display = this.value==='custom'?'block':'none'; preview();
        });
        document.getElementById('psm-ptr').addEventListener('change', function(){
            document.getElementById('psm-ptr-cw').style.display = this.value==='custom'?'block':'none'; preview();
        });
        document.getElementById('psm-my-ci').addEventListener('input', preview);
        document.getElementById('psm-ptr-ci').addEventListener('input', preview);
        preview();

        function close(){ wrap.remove(); }
        document.getElementById('psm-close').addEventListener('click', close);
        document.getElementById('psm-cancel').addEventListener('click', close);
        wrap.addEventListener('click', function(e){ if(e.target===wrap) close(); });
        document.getElementById('psm-save').addEventListener('click', function(){
            var mv = document.getElementById('psm-my').value;
            var pv = document.getElementById('psm-ptr').value;
            localStorage.setItem(MY_SYM_KEY, mv);
            localStorage.setItem(PTR_SYM_KEY, pv);
            if(mv==='custom') localStorage.setItem(MY_CUST_KEY, document.getElementById('psm-my-ci').value.trim());
            if(pv==='custom') localStorage.setItem(PTR_CUST_KEY, document.getElementById('psm-ptr-ci').value.trim());
            close();
            if(window._syncPokeDesc) window._syncPokeDesc();
            if(typeof showNotification==='function') showNotification('戳一戳符号已保存 ✓','success',1800);
        });
    };

    function _syncPokeDesc() {
        var ms = localStorage.getItem(MY_SYM_KEY)||'star4';
        var ps = localStorage.getItem(PTR_SYM_KEY)||'star4';
        var ml = (PRESETS.find(function(p){return p.value===ms;})||{}).label||ms;
        var pl = (PRESETS.find(function(p){return p.value===ps;})||{}).label||ps;
        var d = document.getElementById('poke-symbol-desc');
        if(d) d.textContent = '我: '+ml+'  /  对方: '+pl;
    }
    window._syncPokeDesc = _syncPokeDesc;
    document.addEventListener('DOMContentLoaded', _syncPokeDesc);
    setTimeout(_syncPokeDesc, 600);
})();

(function() {
    var KEY = 'headerAlwaysClear';
    function _get() { return localStorage.getItem(KEY) === 'true'; }

    function _applyHeader() {
        var en = _get();
        var id = 'header-clear-override';
        var t  = document.getElementById(id);
        if (!t) { t = document.createElement('style'); t.id = id; document.head.appendChild(t); }
        if (en) {
            t.textContent = '.header { opacity: 1 !important; }';
        } else {
            t.textContent = [
                '.header { opacity: 0.5 !important; transition: opacity 0.3s ease !important; }',
                '.header:hover { opacity: 1 !important; }'
            ].join(' ');
        }
    }

    function _syncUI() {
        var en  = _get();
        var row = document.getElementById('header-opacity-toggle');
        if (row) row.classList.toggle('active', en);
        var spans = document.querySelectorAll('#header-opacity-toggle .setting-pill-label span');
        if (spans.length) spans[0].textContent = en ? '已开启，始终清晰' : '关闭后悬停才清晰';
    }

    window._toggleHeaderOpacity = function() {
        localStorage.setItem(KEY, String(!_get()));
        _applyHeader(); _syncUI();
        if (typeof showNotification === 'function')
            showNotification(_get() ? '顶部栏已常驻清晰 ✓' : '顶部栏已恢复悬停清晰', 'success', 1800);
    };

    _applyHeader();
    document.addEventListener('DOMContentLoaded', function(){ _applyHeader(); _syncUI(); });
    setTimeout(function(){ _applyHeader(); _syncUI(); }, 500);
    setTimeout(function(){ _applyHeader(); _syncUI(); }, 1500);
})();

(function() {
    var KEY = 'keepaliveAudioEnabled';
    var SRC = 'https://img.heliar.top/file/1772885159972_silence.m4a';
    var _audio = null;
    var _unlockBound = false;

    function _get() { return localStorage.getItem(KEY) === 'true'; }

    function _createAudio() {
        if (_audio) return _audio;
        _audio = new Audio(SRC);
        _audio.loop   = true;
        _audio.volume = 0.01;
        _audio.preload = 'auto';
        _audio.addEventListener('play',  function(){ _setUI(true);  });
        _audio.addEventListener('pause', function(){ _setUI(false); });
        return _audio;
    }

    function _setUI(playing) {
        var dot  = document.getElementById('keepalive-dot');
        var desc = document.getElementById('keepalive-audio-desc');
        var sw   = document.getElementById('keepalive-audio-switch');
        var row  = document.getElementById('keepalive-bar-row');

        if (sw)   sw.classList.toggle('active', _get());
        if (dot) {
            dot.className = 'keepalive-dot' + (playing ? ' alive' : '');
        }
        if (desc) {
            if (!_get())      desc.textContent = '静音循环音频，防止页面被系统挂起';
            else if (playing) desc.textContent = '运行中 · 页面已保活';
            else              desc.textContent = '等待交互后启动…';
        }
        if (row)  row.style.display = _get() ? 'flex' : 'none';
        var bars = document.querySelectorAll('.keepalive-wave-bar');
        bars.forEach(function(b){ b.style.animationPlayState = playing ? 'running' : 'paused'; });
    }

    function _start() {
        var a = _createAudio();
        var p = a.play();
        if (p && p.then) {
            p.catch(function(){
                _setUI(false);
                if (!_unlockBound) {
                    _unlockBound = true;
                    function unlock(){ if(_get()) a.play().catch(function(){}); _unlockBound=false; }
                    document.addEventListener('touchstart', unlock, { once:true });
                    document.addEventListener('click',      unlock, { once:true });
                }
            });
        }
    }

    function _stop() {
        if (_audio) { _audio.pause(); _audio.currentTime = 0; }
        _setUI(false);
    }

    window._toggleKeepaliveAudio = function() {
        var next = !_get();
        localStorage.setItem(KEY, String(next));
        if (next) {
            _start();
            if (typeof showNotification === 'function') showNotification('保活音频已开启 🎵', 'success', 2000);
        } else {
            _stop();
            if (typeof showNotification === 'function') showNotification('保活音频已关闭', 'info', 1500);
        }
        _setUI(next && _audio && !_audio.paused);
    };

    document.addEventListener('visibilitychange', function(){
        if (_get() && document.visibilityState === 'visible' && _audio && _audio.paused) {
            _audio.play().catch(function(){});
        }
    });

    document.addEventListener('DOMContentLoaded', function(){
        _setUI(false);
        if (_get()) _start();
    });
    setTimeout(function(){
        _setUI(_get() && !!_audio && !_audio.paused);
        if (_get() && (!_audio || _audio.paused)) _start();
    }, 1800);
})();

(function() {
    window._runMsgSearch = function() {
        var inp  = document.getElementById('msg-search-input');
        var from = document.getElementById('msg-search-date-from');
        var to   = document.getElementById('msg-search-date-to');
        var out  = document.getElementById('msg-search-results');
        if (!out) return;

        var q  = inp  ? inp.value.trim().toLowerCase() : '';
        var fd = from && from.value ? new Date(from.value+'T00:00:00') : null;
        var td = to   && to.value   ? new Date(to.value  +'T23:59:59') : null;

        if (!q && !fd && !td) {
            out.innerHTML = '<div class="sri-empty"><i class="fas fa-search"></i><span>输入关键词或选择日期范围</span></div>';
            return;
        }
        if (typeof messages === 'undefined' || !messages || !messages.length) {
            out.innerHTML = '<div class="sri-empty"><i class="fas fa-inbox"></i><span>暂无聊天记录</span></div>';
            return;
        }

        var res = messages.filter(function(m){
            if (m.type === 'system') return false;
            var ts = m.timestamp ? new Date(m.timestamp) : null;
            if (fd && ts && ts < fd) return false;
            if (td && ts && ts > td) return false;
            if (q) return m.text && m.text.toLowerCase().indexOf(q) !== -1;
            return true;
        });

        if (!res.length) {
            out.innerHTML = '<div class="sri-empty"><i class="fas fa-inbox"></i><span>未找到匹配消息</span></div>';
            return;
        }

        function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function hi(t,k){
            if(!k||!t) return esc(t||'');
            return esc(t).replace(new RegExp('('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:rgba(var(--accent-color-rgb),.28);color:var(--text-primary);border-radius:3px;padding:0 2px;">$1</mark>');
        }
        function fmt(ts){
            if(!ts) return '';
            var d=new Date(ts);
            return d.getFullYear()+'/'+(d.getMonth()+1+'').padStart(2,'0')+'/'+(d.getDate()+'').padStart(2,'0')+' '+(d.getHours()+'').padStart(2,'0')+':'+(d.getMinutes()+'').padStart(2,'0');
        }
        function nm(m){ return m.sender==='user'?((typeof settings!=='undefined'&&settings.myName)||'我'):((typeof settings!=='undefined'&&settings.partnerName)||'对方'); }

        var _myAvSrc = (function(){
            var el = document.querySelector('#my-avatar img,[id*="my-avatar"] img');
            return el ? el.src : null;
        })();
        var _partnerAvSrc = (function(){
            var el = document.querySelector('#partner-avatar img,[id*="partner-avatar"] img,.partner-avatar img');
            return el ? el.src : null;
        })();
        function _avHtml(isMe) {
            var src = isMe ? _myAvSrc : _partnerAvSrc;
            if (src) return '<img src="'+src+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            return '<i class="fas fa-'+(isMe?'user':'user-circle')+'" style="font-size:16px;color:rgba(255,255,255,.8);"></i>';
        }
        var html = '<div style="font-size:12px;color:var(--text-secondary);padding:0 2px 8px;">共 <b style="color:var(--accent-color)">'+res.length+'</b> 条</div>';
        html += res.slice(0,200).map(function(m){
            var isMe = m.sender==='user';
            var preview = m.text?(m.text.length>100?m.text.slice(0,100)+'…':m.text):(m.image?'[图片]':'');
            return '<div class="search-result-item" onclick="window._scrollToMsg&&window._scrollToMsg('+m.id+')">'+
                '<div class="sri-avatar '+(isMe?'sri-me':'sri-partner')+'">'+_avHtml(isMe)+'</div>'+
                '<div class="sri-body">'+
                  '<div class="sri-meta"><span class="sri-name">'+esc(nm(m))+'</span><span class="sri-time">'+fmt(m.timestamp)+'</span></div>'+
                  '<div class="sri-text">'+hi(preview,q)+'</div>'+
                '</div>'+
            '</div>';
        }).join('');
        if (res.length>200) html+='<div style="text-align:center;font-size:12px;color:var(--text-secondary);padding:6px 0">仅显示前 200 条</div>';
        out.innerHTML = html;
    };

    window._scrollToMsg = function(id) {
        var m = document.getElementById('stats-modal');
        if (m) {
            var content = m.querySelector('.modal-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px) scale(0.95)';
            }
            if (m._hideTimeout) clearTimeout(m._hideTimeout);
            m._hideTimeout = setTimeout(function() {
                m.style.display = 'none';
            }, 300);
        }

        setTimeout(function() {
            var el = document.querySelector('[data-id="'+id+'"]') || document.querySelector('[data-message-id="'+id+'"]');
            if (el) {
                el.scrollIntoView({behavior:'smooth',block:'center'});
                el.style.transition='background .3s ease';
                el.style.background='rgba(var(--accent-color-rgb),.14)';
                setTimeout(function(){ el.style.background=''; }, 1800);
            } else {
                var msgIndex = -1;
                if (typeof messages !== 'undefined') {
                    for (var i = 0; i < messages.length; i++) {
                        if (String(messages[i].id) === String(id)) {
                            msgIndex = i;
                            break;
                        }
                    }
                }
                if (msgIndex === -1) {
                    if (typeof showNotification==='function') showNotification('消息可能已被删除','info',2000);
                    return;
                }
                if (typeof displayedMessageCount !== 'undefined') {
                    var needed = messages.length - msgIndex;
                    if (needed > displayedMessageCount) {
                        displayedMessageCount = needed + 10;
                        if (typeof renderMessages === 'function') renderMessages(false);
                        setTimeout(function() {
                            var el2 = document.querySelector('[data-id="'+id+'"]') || document.querySelector('[data-message-id="'+id+'"]');
                            if (el2) {
                                el2.scrollIntoView({behavior:'smooth',block:'center'});
                                el2.style.transition='background .3s ease';
                                el2.style.background='rgba(var(--accent-color-rgb),.14)';
                                setTimeout(function(){ el2.style.background=''; }, 1800);
                            } else {
                                if (typeof showNotification==='function') showNotification('消息定位失败','info',2000);
                            }
                        }, 200);
                    }
                }
            }
        }, 350);
    };
})();

function renderComboMenu() {
    const content = document.getElementById('user-sticker-content');
    content.innerHTML = '';
    
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; gap:8px; padding:8px; border-bottom:1px solid var(--border-color);';
    tabBar.innerHTML = `
        <button class="combo-tab active" data-tab="emoji" style="flex:1; padding:8px; border:none; background:var(--accent-color); color:#fff; border-radius:8px; cursor:pointer;">
            😊 表情
        </button>
        <button class="combo-tab" data-tab="poke" style="flex:1; padding:8px; border:none; background:var(--secondary-bg); color:var(--text-primary); border-radius:8px; cursor:pointer;">
            ✨ 拍一拍
        </button>
        <button class="combo-tab" data-tab="voice" style="flex:1; padding:8px; border:none; background:var(--secondary-bg); color:var(--text-primary); border-radius:8px; cursor:pointer;">
            🎤 语音
        </button>
    `;
    
    const contentArea = document.createElement('div');
    contentArea.id = 'combo-content-area';
    contentArea.style.cssText = 'padding:10px; max-height:240px; overflow-y:auto;';
    
    content.appendChild(tabBar);
    content.appendChild(contentArea);
    
    showEmojiTab();
    
    tabBar.querySelectorAll('.combo-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabBar.querySelectorAll('.combo-tab').forEach(b => {
                b.style.background = 'var(--secondary-bg)';
                b.style.color = 'var(--text-primary)';
                b.classList.remove('active');
            });
            btn.style.background = 'var(--accent-color)';
            btn.style.color = '#fff';
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'emoji') {
                showEmojiTab();
            } else if (btn.dataset.tab === 'poke') {
                showPokeTab();
            } else if (btn.dataset.tab === 'voice') {
                showVoiceTab();
            }
        });
    });
}

function showEmojiTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'grid';
    area.style.gridTemplateColumns = 'repeat(5, 1fr)';
    area.style.gap = '8px';
    
    CONSTANTS.REPLY_EMOJIS.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.innerHTML = `<span style="font-size:24px;">${emoji}</span>`;
        item.onclick = () => {
            const input = document.getElementById('message-input');
            input.value += emoji;
            document.getElementById('user-sticker-picker').classList.remove('active');
            input.focus();
        };
        area.appendChild(item);
    });
    customEmojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.innerHTML = `<span style="font-size:24px;">${emoji}</span>`;
        item.onclick = () => {
            const input = document.getElementById('message-input');
            input.value += emoji;
            document.getElementById('user-sticker-picker').classList.remove('active');
            input.focus();
        };
        area.appendChild(item);
    });

    stickerLibrary.forEach(src => {
        const item = document.createElement('div');
        item.className = 'picker-item';
        item.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">`;
        item.onclick = () => {
            if (isBatchMode) {
                batchMessages.push({ id: Date.now() + batchMessages.length, text: '', image: src });
                updateBatchPreview();
                showNotification('已添加到批量发送', 'success', 1200);
            } else {
                addMessage({
                    id: Date.now(),
                    sender: 'user',
                    text: '',
                    timestamp: new Date(),
                    image: src,
                    status: 'sent',
                    type: 'normal'
                });
                playSound('send');
                
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                if (window._pendingReplyTimer) clearTimeout(window._pendingReplyTimer);
                window._pendingReplyTimer = setTimeout(() => { window._pendingReplyTimer = null; simulateReply(); }, randomDelay);
            }
            document.getElementById('user-sticker-picker').classList.remove('active');
        };
        area.appendChild(item);
    });
}

function showPokeTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'flex';
    area.style.flexDirection = 'column';
    area.style.gap = '8px';

    const pokes = (typeof myPokes !== 'undefined' && Array.isArray(myPokes)) ? myPokes : [];

    if (pokes.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:30px 10px;color:var(--text-secondary);font-size:13px;';
        empty.innerHTML = '<i class="fas fa-hand-sparkles" style="font-size:24px;margin-bottom:8px;display:block;opacity:0.4;"></i>暂无拍一拍<br><span style="font-size:11px;opacity:0.6;">点击下方按钮添加</span>';
        area.appendChild(empty);
    }

    pokes.forEach((pokeText, idx) => {
        const cleanPokeText = (typeof window._sanitizePokeTextForDisplay === 'function')
            ? window._sanitizePokeTextForDisplay(pokeText)
            : pokeText;
        const item = document.createElement('div');
        item.style.cssText = `
            display:flex;align-items:center;gap:8px;padding:10px 12px;
            background:var(--primary-bg);border:1px solid var(--border-color);
            border-radius:12px;cursor:pointer;
            transition:all 0.2s;font-family:var(--font-family);
        `;
        const _esc = (typeof window !== 'undefined' && window.escapeHtml) ? window.escapeHtml : (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
        item.innerHTML = `
            <div style="flex:1;min-width:0;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${_esc(cleanPokeText)}">${_esc(cleanPokeText)}</div>
            <button class="poke-send-btn" title="发送" style="width:28px;height:28px;border-radius:8px;border:1px solid var(--border-color);background:var(--accent-color);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;">
                <i class="fas fa-paper-plane"></i>
            </button>
            <button class="poke-del-btn" title="删除" style="width:28px;height:28px;border-radius:8px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-secondary);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        item.addEventListener('mouseover', () => {
            item.style.borderColor = 'var(--accent-color)';
            item.style.background = 'rgba(var(--accent-color-rgb),0.04)';
        });
        item.addEventListener('mouseout', () => {
            item.style.borderColor = 'var(--border-color)';
            item.style.background = 'var(--primary-bg)';
        });
        item.querySelector('.poke-send-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            addMessage({
                id: Date.now(),
                text: _formatPokeText(`${settings.myName} ${cleanPokeText}`),
                timestamp: new Date(),
                type: 'system'
            });
            document.getElementById('user-sticker-picker').classList.remove('active');
            if (typeof playSound === 'function') playSound('poke');
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, randomDelay);
        });
        item.querySelector('.poke-del-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定删除此拍一拍？')) {
                myPokes.splice(idx, 1);
                if (typeof throttledSaveData === 'function') throttledSaveData();
                showPokeTab(); 
            }
        });
        item.addEventListener('click', () => {
            addMessage({
                id: Date.now(),
                text: _formatPokeText(`${settings.myName} ${cleanPokeText}`),
                timestamp: new Date(),
                type: 'system'
            });
            document.getElementById('user-sticker-picker').classList.remove('active');
            if (typeof playSound === 'function') playSound('poke');
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, randomDelay);
        });
        area.appendChild(item);
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:4px;';

    const addBtn = document.createElement('button');
    addBtn.innerHTML = '<i class="fas fa-plus"></i> 添加拍一拍';
    addBtn.style.cssText = `
        flex:1;padding:11px 14px;
        background:linear-gradient(135deg, var(--accent-color), rgba(var(--accent-color-rgb),0.8));
        color:#fff;border:none;border-radius:12px;cursor:pointer;
        font-weight:600;font-size:13px;width:100%;
        letter-spacing:0.3px;box-shadow:0 4px 14px rgba(var(--accent-color-rgb),0.25);
        font-family:var(--font-family);
    `;
    addBtn.onclick = () => {
        document.getElementById('user-sticker-picker').classList.remove('active');
        showModal(DOMElements.pokeModal.modal, DOMElements.pokeModal.input);
    };
    btnRow.appendChild(addBtn);

    if (pokes.length > 0) {
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        clearBtn.title = '清空全部';
        clearBtn.style.cssText = `
            width:42px;height:42px;border-radius:12px;border:1px solid var(--border-color);
            background:var(--primary-bg);color:var(--text-secondary);cursor:pointer;
            display:flex;align-items:center;justify-content:center;font-size:13px;
            flex-shrink:0;font-family:var(--font-family);
        `;
        clearBtn.onmouseover = () => { clearBtn.style.color = '#e74c3c'; clearBtn.style.borderColor = '#e74c3c'; };
        clearBtn.onmouseout = () => { clearBtn.style.color = 'var(--text-secondary)'; clearBtn.style.borderColor = 'var(--border-color)'; };
        clearBtn.onclick = () => {
            if (confirm('确定清空所有拍一拍？此操作不可恢复。')) {
                myPokes = [];
                if (typeof throttledSaveData === 'function') throttledSaveData();
                showPokeTab();
            }
        };
        btnRow.appendChild(clearBtn);
    }

    area.appendChild(btnRow);
}

function showVoiceTab() {
    const area = document.getElementById('combo-content-area');
    area.innerHTML = '';
    area.style.display = 'flex';
    area.style.flexDirection = 'column';
    area.style.gap = '8px';

    const voices = (typeof customVoices !== 'undefined' && Array.isArray(customVoices)) ? customVoices : [];

    if (voices.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:30px 10px;color:var(--text-secondary);font-size:13px;';
        empty.innerHTML = '<i class="fas fa-microphone-slash" style="font-size:24px;margin-bottom:8px;display:block;opacity:0.4;"></i>暂无语音<br><span style="font-size:11px;opacity:0.6;">请在自定义回复-语音中添加</span>';
        area.appendChild(empty);
        return;
    }

    voices.forEach((voice, idx) => {
        const item = document.createElement('div');
        item.style.cssText = `
            display:flex;align-items:center;gap:10px;padding:10px 12px;
            background:var(--primary-bg);border:1px solid var(--border-color);
            border-radius:12px;cursor:pointer;
            transition:all 0.2s;font-family:var(--font-family);
        `;
        item.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:13px;">
                <i class="fas fa-play"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(voice.text || '未命名语音')}</div>
            </div>
            <i class="fas fa-paper-plane" style="color:var(--text-secondary);font-size:12px;flex-shrink:0;"></i>
        `;
        item.addEventListener('mouseover', () => {
            item.style.borderColor = 'var(--accent-color)';
            item.style.background = 'rgba(var(--accent-color-rgb,180,140,100),0.06)';
        });
        item.addEventListener('mouseout', () => {
            item.style.borderColor = 'var(--border-color)';
            item.style.background = 'var(--primary-bg)';
        });
        item.onclick = () => {
            const voiceMsg = {
                id: Date.now(),
                sender: 'user',
                text: '',
                timestamp: new Date(),
                type: 'voice',
                voiceUrl: voice.audioUrl,
                voiceText: voice.text,
                voiceDuration: 0,
                status: 'sent',
                favorited: false,
                note: null,
                replyTo: null
            };
            let sent = false;
            const doSend = () => {
                if (sent) return;
                sent = true;
                addMessage(voiceMsg);
            };
            if (voice.audioUrl) {
                try {
                    const tmpAudio = new Audio(voice.audioUrl);
                    tmpAudio.addEventListener('loadedmetadata', () => {
                        voiceMsg.voiceDuration = Math.round(tmpAudio.duration) || 0;
                        doSend();
                    });
                    tmpAudio.addEventListener('canplaythrough', () => {
                        voiceMsg.voiceDuration = Math.round(tmpAudio.duration) || 0;
                        doSend();
                    });
                    tmpAudio.addEventListener('error', () => { doSend(); });
                    setTimeout(doSend, 2000);
                } catch(e) {
                    doSend();
                }
            } else {
                doSend();
            }
            document.getElementById('user-sticker-picker').classList.remove('active');
            playSound('send');
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, randomDelay);
        };
        area.appendChild(item);
    });
}

        function initCoreListeners() {
            DOMElements.sendBtn.addEventListener('click', () => isBatchMode ? addToBatch(): sendMessage());
            DOMElements.messageInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); isBatchMode ? addToBatch(): sendMessage();
                }
            });
            DOMElements.messageInput.addEventListener('input', () => {
                DOMElements.messageInput.style.height = 'auto'; DOMElements.messageInput.style.height = `${Math.min(DOMElements.messageInput.scrollHeight, 120)}px`;
            });

            DOMElements.attachmentBtn.addEventListener('click', () => {

                const modal = document.createElement('div');
                modal.className = 'modal image-upload-modal';
                modal.style.cssText = `
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s ease;
            `;

                modal.innerHTML = `
            <div class="modal-content" style="
            z-index: 10000;
            position: relative;
            background-color: var(--secondary-bg);
            border-radius: var(--radius);
            padding: 24px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.3s ease;
            ">
            <div class="modal-title"><i class="fas fa-image"></i><span>发送图片</span></div>
            <div style="margin-bottom: 16px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button class="modal-btn modal-btn-secondary upload-mode-btn active" id="upload-image-file-btn" style="flex: 1;">选择文件</button>
            <button class="modal-btn modal-btn-secondary upload-mode-btn" id="paste-image-url-btn" style="flex: 1;">粘贴URL</button>
            </div>
            <input type="file" class="modal-input" id="image-file-input" accept="image/*">
            <input type="text" class="modal-input" id="image-url-input" placeholder="输入图片URL地址" style="display: none;">
            <div id="image-preview" style="text-align: center; margin-top: 10px; display: none;">
            <img id="preview-chat-image" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
            </div>
            <div class="modal-buttons">
            <button class="modal-btn modal-btn-secondary" id="cancel-image">取消</button>
            <button class="modal-btn modal-btn-primary" id="send-image" disabled>发送</button>
            </div>
            </div>
            `;

                document.body.appendChild(modal);

                setTimeout(() => {
                    modal.style.opacity = '1';
                    const content = modal.querySelector('.modal-content');
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }, 10);

                const fileInput = document.getElementById('image-file-input');
                const urlInput = document.getElementById('image-url-input');
                const uploadBtn = document.getElementById('upload-image-file-btn');
                const pasteUrlBtn = document.getElementById('paste-image-url-btn');
                const previewDiv = document.getElementById('image-preview');
                const previewImg = document.getElementById('preview-chat-image');
                const sendBtn = document.getElementById('send-image');
                const cancelBtn = document.getElementById('cancel-image');
                const uploadModeBtns = document.querySelectorAll('.upload-mode-btn');

                let currentImageData = null;

                function switchUploadMode(isFileMode) {
                    uploadModeBtns.forEach(btn => btn.classList.remove('active'));
                    if (isFileMode) {
                        uploadBtn.classList.add('active');
                        fileInput.style.display = 'block';
                        urlInput.style.display = 'none';
                    } else {
                        pasteUrlBtn.classList.add('active');
                        fileInput.style.display = 'none';
                        urlInput.style.display = 'block';
                        urlInput.focus();
                    }

                    previewDiv.style.display = 'none';
                    sendBtn.disabled = true;
                    currentImageData = null;
                }

                uploadBtn.addEventListener('click', () => switchUploadMode(true));

                pasteUrlBtn.addEventListener('click', () => switchUploadMode(false));

                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > MAX_IMAGE_SIZE) {
                            showNotification('图片大小不能超过5MB', 'error');
                            return;
                        }
                        showNotification('正在优化图片...', 'info', 1500);
                        optimizeImage(file).then(optimizedData => {
                            currentImageData = optimizedData;
                            previewImg.src = currentImageData;
                            previewDiv.style.display = 'block';
                            sendBtn.disabled = false;
                        }).catch(() => {
                            showNotification('图片处理失败', 'error');
                        });
                    }
                });

                urlInput.addEventListener('input',
                    function() {
                        const url = urlInput.value.trim();
                        if (url) {
                            if (/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|bmp))$/i.test(url)) {
                                previewImg.src = url;
                                previewDiv.style.display = 'block';
                                currentImageData = url;
                                sendBtn.disabled = false;

                                const img = new Image();
                                img.onload = function() {
                                    previewImg.src = url;
                                    showNotification('图片URL有效', 'success', 1000);
                                };
                                img.onerror = function() {
                                    showNotification('图片URL无效或无法访问', 'error');
                                    sendBtn.disabled = true;
                                    previewDiv.style.display = 'none';
                                };
                                img.src = url;
                            } else {
                                sendBtn.disabled = true;
                                previewDiv.style.display = 'none';
                            }
                        } else {
                            sendBtn.disabled = true;
                            previewDiv.style.display = 'none';
                        }
                    });

                sendBtn.addEventListener('click',
                    () => {
                        if (currentImageData) {
                            addMessage({
                                id: Date.now(),
                                sender: 'user',
                                text: '',
                                timestamp: new Date(),
                                image: currentImageData,
                                status: 'sent',
                                favorited: false,
                                note: null,
                                replyTo: currentReplyTo,
                                type: 'normal'
                            });
                            playSound('send');
                            currentReplyTo = null;
                            updateReplyPreview();
                            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                            setTimeout(simulateReply, randomDelay);

                            closeModal();
                        }
                    });

                cancelBtn.addEventListener('click',
                    closeModal);

                function closeModal() {
                    modal.style.opacity = '0';
                    const content = modal.querySelector('.modal-content');
                    content.style.opacity = '0';
                    content.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        if (modal.parentNode) {
                            modal.parentNode.removeChild(modal);
                        }
                    },
                        300);
                }

                modal.addEventListener('click',
                    (e) => {
                        if (e.target === modal) {
                            closeModal();
                        }
                    });

                modal.querySelector('.modal-content').addEventListener('click',
                    (e) => {
                        e.stopPropagation();
                    });

                const handleEscKey = (e) => {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', handleEscKey);
                    }
                };
                document.addEventListener('keydown', handleEscKey);

                modal.addEventListener('close', () => {
                    document.removeEventListener('keydown', handleEscKey);
                });
            });

            DOMElements.imageInput.addEventListener('change', () => {
                if (DOMElements.imageInput.files[0]) {
                    if (isBatchMode) {
                        showNotification('批量模式不支持图片', 'warning');
                        DOMElements.imageInput.value = '';
                    } else {
                        sendMessage();
                    }
                }
            });

            DOMElements.continueBtn.addEventListener('click', simulateReply);
            DOMElements.batchBtn.addEventListener('click', toggleBatchMode);
        }

window._dailyGreetingReady = false;

function _getDailyGreetingData() {
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();

    var timeLabel = '早上好', timeEmoji = '🌅';
    if (hour >= 12 && hour < 18) { timeLabel = '下午好'; timeEmoji = '☀️'; }
    else if (hour >= 18 && hour < 22) { timeLabel = '傍晚好'; timeEmoji = '🌇'; }
    else if (hour >= 22 || hour < 6) { timeLabel = '晚上好'; timeEmoji = '🌙'; }

var festivals = [
    { m:1, d:1, name:'元旦', emoji:'🎆', label:'NEW YEAR', note:'新年快乐！愿新的一年里，你们的爱情越来越甜蜜，每一天都充满幸福与惊喜～' },
    { m:1, d:5, name:'小寒', emoji:'❄️', label:'MINOR COLD', note:'小寒至，春不远。有你在身边，心里总是暖暖的。' },
    { m:1, d:20, name:'大寒', emoji:'🧊', label:'MAJOR COLD', note:'大寒快乐，记得添衣保暖。你的拥抱就是最暖的炉火。' },

    { m:2, d:4, name:'立春', emoji:'🌱', label:'START OF SPRING', note:'立春快乐！春天来了，我们的爱也像新芽一样蓬勃生长。' },
    { m:2, d:14, name:'情人节', emoji:'💝', label:'VALENTINES DAY', note:'情人节快乐，亲爱的！你是我最美好的礼物，爱你哦～' },
    { m:2, d:16, name:'除夕', emoji:'🧧', label:'CHINESE NEW YEAR EVE', note:'除夕快乐！辞旧迎新，愿你们携手跨入幸福的新一年，万事如意！' },
    { m:2, d:17, name:'春节', emoji:'🎊', label:'SPRING FESTIVAL', note:'新年快乐！新的一年，愿你们相爱如初，甜蜜长久。' },
    { m:2, d:18, name:'雨水', emoji:'☔', label:'RAIN WATER', note:'雨水节气，愿幸福像春雨一样滋润你的每一天。' },

    { m:3, d:3, name:'元宵节', emoji:'🏮', label:'LANTERN FESTIVAL', note:'元宵节快乐！花灯映月，你是我心里最亮的那盏灯。' },
    { m:3, d:5, name:'惊蛰', emoji:'⚡', label:'AWAKENING OF INSECTS', note:'惊蛰春雷响，万物复苏，你是我最美的春天。' },
    { m:3, d:8, name:'妇女节', emoji:'🌹', label:'WOMENS DAY', note:'今天是属于你的节日，愿你永远被温柔相待，被爱守护。' },
    { m:3, d:12, name:'植树节', emoji:'🌳', label:'TREE PLANTING DAY', note:'今天种下一棵树，也在心里种下对你不变的爱。' },
    { m:3, d:20, name:'春分', emoji:'🌸', label:'SPRING EQUINOX', note:'春分昼夜平分，我的爱对你从不偏心——永远满分。' },

    { m:4, d:1, name:'愚人节', emoji:'🤡', label:'APRIL FOOLS', note:'今天可以骗你说“我不爱你了”，但我的心骗不了自己～' },
    { m:4, d:5, name:'清明节', emoji:'🌧', label:'QINGMING FESTIVAL', note:'慎终追远，珍惜眼前。有你在，每一天都格外温暖。' },
    { m:4, d:20, name:'谷雨', emoji:'🌾', label:'GRAIN RAIN', note:'谷雨生百谷，你是我生命里最饱满的那颗。' },

    { m:5, d:1, name:'劳动节', emoji:'🛠️', label:'LABOR DAY', note:'劳动最光荣，但我更光荣的是能拥有你。' },
    { m:5, d:4, name:'青年节', emoji:'✨', label:'YOUTH DAY', note:'青春正好，与你共度。愿我们永远年轻，永远热泪盈眶。' },
    { m:5, d:5, name:'立夏', emoji:'☀️', label:'START OF SUMMER', note:'立夏快乐！愿我们的爱像夏天一样热情。' },
    { m:5, d:20, name:'520', emoji:'💕', label:'I LOVE YOU', note:'520，我爱你！感谢你出现在我的生命里，你是我最好的选择。' },
    { m:5, d:21, name:'小满', emoji:'🌾', label:'GRAIN BUDS', note:'小满未满，万物可期。我对你的爱永远在增长的季节。' },

    { m:6, d:1, name:'儿童节', emoji:'🎈', label:'CHILDRENS DAY', note:'愿你永远保持那颗童心，和我一起做个快乐的大小孩。' },
    { m:6, d:5, name:'芒种', emoji:'🌽', label:'GRAIN IN EAR', note:'芒种忙种，有你在的日子，每天都是收获。' },
    { m:6, d:19, name:'端午节', emoji:'🛶', label:'DRAGON BOAT FESTIVAL', note:'粽子软糯，你更甜～端午安康！' },
    { m:6, d:21, name:'夏至', emoji:'🍉', label:'SUMMER SOLSTICE', note:'夏至最长的一天，我的思念比它还长。' },

    { m:7, d:6, name:'小暑', emoji:'🌡️', label:'MINOR HEAT', note:'小暑入伏天，你的怀抱是最清凉的风。' },
    { m:7, d:23, name:'大暑', emoji:'🔥', label:'MAJOR HEAT', note:'大暑炎炎，你是我心里的冰镇西瓜。' },

    { m:8, d:7, name:'立秋', emoji:'🍁', label:'START OF AUTUMN', note:'立秋快乐，愿与你共赏每一片秋叶。' },
    { m:8, d:19, name:'七夕节', emoji:'🌌', label:'QIXI FESTIVAL', note:'七夕快乐！牛郎织女一年只见一次，而我们每天都在一起，真幸运。' },
    { m:8, d:23, name:'处暑', emoji:'🌬️', label:'END OF HEAT', note:'处暑出暑，炎热渐消，爱意不减。' },

    { m:9, d:7, name:'白露', emoji:'💧', label:'WHITE DEW', note:'白露为霜，所谓伊人，在我身旁。' },
    { m:9, d:10, name:'教师节', emoji:'📚', label:'TEACHERS DAY', note:'你是我人生中最特别的老师，教会了我什么是爱。' },
    { m:9, d:23, name:'秋分', emoji:'🍂', label:'AUTUMN EQUINOX', note:'秋分昼夜均，你是我心里的天平。' },
    { m:9, d:25, name:'中秋节', emoji:'🌕', label:'MID AUTUMN FESTIVAL', note:'月圆人团圆，有你才叫团圆。中秋快乐！' },

    { m:10, d:1, name:'国庆节', emoji:'🎑', label:'NATIONAL DAY', note:'国庆快乐！和你在一起的每一天都像节日，爱你。' },
    { m:10, d:8, name:'寒露', emoji:'🍃', label:'COLD DEW', note:'寒露凝霜，有你在心里总是暖的。' },
    { m:10, d:23, name:'霜降', emoji:'❄️', label:'FROST DESCENT', note:'霜降叶落，我的爱却常青。' },
    { m:10, d:31, name:'万圣夜', emoji:'🎃', label:'HALLOWEEN', note:'不给糖就捣蛋，但你给了我全世界最甜的糖——你的爱。' },

    { m:11, d:7, name:'立冬', emoji:'🧣', label:'START OF WINTER', note:'立冬快乐，你的拥抱是冬天里最暖的阳光。' },
    { m:11, d:11, name:'光棍节', emoji:'👫', label:'SINGLES DAY', note:'幸好我们不用过这个节，因为我有你。' },
    { m:11, d:22, name:'小雪', emoji:'⛄', label:'MINOR SNOW', note:'小雪飘飘，你是我心里最暖的那团火。' },
    { m:11, d:26, name:'感恩节', emoji:'🙏', label:'THANKSGIVING', note:'感谢生命中有你，每一天都是恩赐。' },

    { m:12, d:7, name:'大雪', emoji:'☃️', label:'MAJOR SNOW', note:'大雪封门，封不住我对你的想念。' },
    { m:12, d:22, name:'冬至', emoji:'🥟', label:'WINTER SOLSTICE', note:'冬至快乐，记得吃饺子，但记得想我。' },
    { m:12, d:24, name:'平安夜', emoji:'🎄', label:'CHRISTMAS EVE', note:'平安夜快乐！愿你平平安安，我们的爱情也岁岁常安。' },
    { m:12, d:25, name:'圣诞节', emoji:'🎅', label:'MERRY CHRISTMAS', note:'圣诞快乐！你就是我收到的最好的礼物，永远爱你。' },
    { m:12, d:31, name:'跨年夜', emoji:'🎆', label:'NEW YEAR EVE', note:'再见这一年，你是我最好的收获。新的一年，继续爱你。' }
];
var festival = null;
    for (var fi = 0; fi < festivals.length; fi++) {
        if (festivals[fi].m === month && festivals[fi].d === day) { festival = festivals[fi]; break; }
    }

  var weathers = [
    '晴空万里',
    '多云转晴',
    '阴天有云',
    '细雨蒙蒙',
    '春风和煦',
    '微微寒冷',
    '清风徐徐',
    '雨后初晴',
    '夜色宁静',
    '月光皎洁',
    '晴间多云',
    '大雨滂沱',
    '雷雨交加',
    '小雪纷飞',
    '微风拂面',
    '多云天气',
    '雾气朦胧',
    '星光璀璨',
    '朝霞满天',
    '夕阳西下',
    '海风轻拂',
    '山间清爽',
    '秋叶飘落',
    '花香四溢',
    '绿意盎然',
    '雨后清新',
    '雪花飞舞',
    '阳光明媚'
];

var statusPool = [
    '正在想你 💭',
    '忙碌中，但心里有你',
    '好好的，别担心 ✨',
    '期待见到你',
    '有点想你了',
    '在努力变更好',
    '今天挺安静的',
    '心情不错哦 🌱',
    '一切都好，你呢？',
    '看月亮，想到你 🌙',
    '今天有点想你',
    '刚刚看到一朵云像你 ☁️',
    '工作再忙也会想你的',
    '今天你开心吗？',
    '梦里见 💤',
    '好好吃饭了吗？',
    '记得多喝水哦 💧',
    '今天有没有照顾好自己',
    '想你，但不说 🤫',
    '全世界你最可爱',
    '今天天气不错，适合想你',
    '吃饱喝足，开始想你',
    '今天也想牵你的手',
    '你有没有想我',
    '今天比昨天更想你',
    '看到好吃的想分享给你 🍜',
    '听到一首歌想到你 🎵',
    '今天也要加油鸭',
    '晚安，我的全世界 🌙',
    '早安，又是想你的一天'
];
    var todayKey = String(now.getFullYear()) + String(month) + String(day);
    var userSalt = localStorage.getItem('_dgUserSalt');
    if (!userSalt) {
        userSalt = String(Math.floor(Math.random() * 999983) + 1);
        localStorage.setItem('_dgUserSalt', userSalt);
    }
    var seed = 0;
    var saltedKey = todayKey + userSalt;
    for (var si = 0; si < saltedKey.length; si++) seed += saltedKey.charCodeAt(si) * (si + 1);
    function seededRandDg(s, offset) {
        var x = Math.sin(s * 9301 + offset * 49297 + 233) * 1000003;
        return x - Math.floor(x);
    }
    var defaultWeather = weathers[Math.floor(seededRandDg(seed, 0) * weathers.length)];
    var customWeatherKey = 'customWeather_' + now.getFullYear() + '_' + month + '_' + day;
    var weather = localStorage.getItem(customWeatherKey) || defaultWeather;

    var userStatusPool = [];
    try { userStatusPool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e) {}
    var userStatusTexts = userStatusPool.map(function(item) { return item.status || item; }).filter(Boolean);
    var mixedStatusPool = statusPool.concat(userStatusTexts);
    var status = mixedStatusPool[Math.floor(seededRandDg(seed, 1) * mixedStatusPool.length)];

    return { timeLabel: timeLabel, timeEmoji: timeEmoji, festival: festival, weather: weather, status: status };
}

function _buildDailyGreeting() {
    try {
        var data = _getDailyGreetingData();
        var festival = data.festival;
        var timeLabel = data.timeLabel;
        var timeEmoji = data.timeEmoji;
        var weather = data.weather;
        var status = data.status;

        var now = new Date();
        var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

        var moodDataRaw = window.moodData || {};
        var todayMood = moodDataRaw[todayStr];
        var allMoods = (typeof getAllMoodOptions === 'function') ? getAllMoodOptions() : [];

        var pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
        var mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';

        var partnerMoodText = pName + ' 今天还没有记录';
        var partnerMoodIcon = null; 
        var partnerMoodNote = '';

        if (todayMood && todayMood.partner) {
            for (var pi = 0; pi < allMoods.length; pi++) {
                if (allMoods[pi].key === todayMood.partner) {
                    partnerMoodText = allMoods[pi].kaomoji + '  ' + allMoods[pi].label;
                    partnerMoodIcon = allMoods[pi].kaomoji;
                    break;
                }
            }
            partnerMoodNote = todayMood.partnerNote || '';
        }

        var h = now.getHours();
        var mainTitle = festival ? (festival.name + '快乐') : timeLabel;
        var festLabel = festival ? festival.label : ('GOOD ' + (h < 12 ? 'MORNING' : h < 18 ? 'AFTERNOON' : 'EVENING'));
        var noteText = festival ? festival.note : '今天也要元气满满，我在这里陪着你 ✦';

        var customData = {};
        try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e2) {}
        
        var now2 = new Date();
        var dailySeed = now2.getFullYear() * 10000 + (now2.getMonth()+1) * 100 + now2.getDate();
        function seededRandom(seed) { return (Math.abs(Math.sin(seed * 9301 + 49297) * 233280) % 233280) / 233280; }
        var todaySeedForText = dailySeed;

        var defaultTitles = festival ? [(festival.name + '快乐')] : [timeLabel, '今天也要开心哦', '你在我心里呀', '想你'];
        var defaultNotes = festival ? [festival.note] : ['今天也要元气满满，我在这里陪着你 ✦', '每一天都因为有你而特别 ✦', '想到你就觉得很安心 ✦', '你是我最喜欢的人 ✦'];

        var mixedTitles = (customData.titles && customData.titles.length > 0) ? [...customData.titles, ...defaultTitles] : 
                          (customData.title ? [customData.title, ...defaultTitles] : defaultTitles);
        var mixedNotes = (customData.notes && customData.notes.length > 0) ? [...customData.notes, ...defaultNotes] :
                         (customData.note ? [customData.note, ...defaultNotes] : defaultNotes);

        mainTitle = mixedTitles[Math.floor(seededRandom(todaySeedForText) * mixedTitles.length)];
        noteText = mixedNotes[Math.floor(seededRandom(todaySeedForText + 1) * mixedNotes.length)];

        function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
        function setElHTML(id, val) { var el = document.getElementById(id); if (el) el.innerHTML = val; }

        var emojiEl = document.getElementById('dg-emoji');
        if (emojiEl) {
            if (festival) {
                emojiEl.textContent = festival.emoji;
            }
        }

        var moodIconEl = document.getElementById('dg-partner-mood-icon');
        if (moodIconEl) {
            if (partnerMoodIcon) {
                moodIconEl.textContent = partnerMoodIcon;
                moodIconEl.style.fontSize = '32px';
            }
        }

        setEl('dg-festival', festLabel);
        setEl('dg-title', mainTitle);
        setEl('dg-partner-mood', partnerMoodText);
        setEl('dg-partner-mood-note', partnerMoodNote || (todayMood && todayMood.partner ? pName + ' 记录了今天的心情 ☆' : ''));

        var statusPoolData = [];
        try { statusPoolData = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
        var systemStatusItems = (function() {
            var sysPool = [];
            var baseStatus = (typeof status !== 'undefined') ? status : '';
            if (baseStatus) sysPool.push({ status: baseStatus, icon: null, iconImg: null });
            return sysPool;
        })();
        var fullPool = systemStatusItems.concat(statusPoolData);
        if (fullPool.length > 0) {
            var poolItem = fullPool[Math.floor(seededRandom(todaySeedForText + 2) * fullPool.length)];
            if (poolItem) {
                setEl('dg-festival', poolItem.label || festLabel);
                setEl('dg-status', poolItem.status || status);
                var emojiEl2 = document.getElementById('dg-emoji');
                if (emojiEl2) {
                    if (poolItem.iconImg) {
                        emojiEl2.textContent = '';
                        emojiEl2.style.backgroundImage = 'url(' + poolItem.iconImg + ')';
                        emojiEl2.style.backgroundSize = 'cover';
                        emojiEl2.style.backgroundPosition = 'center';
                    } else if (poolItem.icon) {
                        emojiEl2.style.backgroundImage = '';
                        emojiEl2.textContent = poolItem.icon;
                    }
                }
            }
        } else {
            setEl('dg-status', status);
        }
        setEl('dg-weather', weather);

        var noteTextEl = document.getElementById('dg-note-text');
        if (noteTextEl) noteTextEl.textContent = noteText;
        var wBadge = document.getElementById('dg-note-weather-badge');
        if (wBadge) wBadge.style.display = 'none';

        setEl('dg-section-label-partner', pName + ' 今日状态');
        setEl('dg-weather-label', pName + ' 的天气');
        setEl('dg-status-label', pName + ' 的状态');

        var months = ['一','二','三','四','五','六','七','八','九','十','十一','十二'];
        setEl('dg-date-stamp', now.getFullYear() + ' · ' + months[now.getMonth()] + '月' + now.getDate() + '日');

        var headerBg = localStorage.getItem('dg_header_bg');
        var bgEl = document.getElementById('dg-header-band-bg');
        if (bgEl && headerBg) {
            bgEl.style.backgroundImage = 'url(' + headerBg + ')';
            bgEl.classList.add('has-img');
        }

        var overlayBg = localStorage.getItem('dg_overlay_bg');
        if (overlayBg) { applyDgOverlayBg(overlayBg); }

        var decoImg = customData.decoImg;
        var decoWrap2 = document.getElementById('dg-deco-img-wrap');
        var decoImgEl2 = document.getElementById('dg-deco-img');
        if (decoWrap2 && decoImgEl2) {
            if (decoImg) {
                decoImgEl2.src = decoImg;
                decoWrap2.style.display = 'block';
            } else {
                decoWrap2.style.display = 'none';
            }
        }
    } catch(e) { console.warn('Daily greeting build error:', e); }
}

window.toggleImmersiveMode = function(force) {
    var isOn = (force !== undefined) ? force : !document.body.classList.contains('immersive-mode');
    document.body.classList.toggle('immersive-mode', isOn);
    var toggle = document.getElementById('immersive-toggle');
    if (toggle) toggle.classList.toggle('active', isOn);
    try { localStorage.setItem('immersive_mode', isOn ? '1' : '0'); } catch(e) {}
    if (!isOn && typeof showNotification === 'function') showNotification('已退出沉浸式模式', 'info');
};

(function() {
    var btn = document.getElementById('immersive-exit-btn');
    if (!btn) return;
    var isDragging = false, hasMoved = false;
    var startX, startY, origRight, origBottom;
    
    function getRight() { return parseInt(btn.style.right) || 20; }
    function getBottom() { return parseInt(btn.style.bottom) || 100; }
    
    function onStart(e) {
        isDragging = true; hasMoved = false;
        btn.classList.add('dragging');
        var touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        origRight = getRight();
        origBottom = getBottom();
        e.preventDefault();
    }
    function onMove(e) {
        if (!isDragging) return;
        var touch = e.touches ? e.touches[0] : e;
        var dx = touch.clientX - startX;
        var dy = touch.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
        var newRight = Math.max(10, Math.min(window.innerWidth - 54, origRight - dx));
        var newBottom = Math.max(10, Math.min(window.innerHeight - 54, origBottom - dy));
        btn.style.right = newRight + 'px';
        btn.style.bottom = newBottom + 'px';
        btn.style.left = 'auto';
        btn.style.top = 'auto';
        e.preventDefault();
    }
    function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        btn.classList.remove('dragging');
        if (!hasMoved) {
            window.toggleImmersiveMode(false);
        }
    }
    btn.addEventListener('mousedown', onStart, {passive: false});
    btn.addEventListener('touchstart', onStart, {passive: false});
    document.addEventListener('mousemove', onMove, {passive: false});
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    
    btn.removeAttribute('onclick');
})();
(function() {
    try {
        if (localStorage.getItem('immersive_mode') === '1') {
            document.body.classList.add('immersive-mode');
            var t = document.getElementById('immersive-toggle');
            if (t) t.classList.add('active');
        }
    } catch(e) {}
})();

window.openDailyGreetingEditor = function() {
    var modal = document.getElementById('dg-editor-modal');
    if (!modal) return;
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e) {}
    var titleEl = document.getElementById('dg-edit-title');
    var noteEl = document.getElementById('dg-edit-note');
    if (titleEl) titleEl.value = (customData.titles && customData.titles.length) ? customData.titles.join('\n') : (customData.title || '');
    if (noteEl) noteEl.value = (customData.notes && customData.notes.length) ? customData.notes.join('\n') : (customData.note || '');

    if (customData.decoImg) {
        var prev = document.getElementById('dg-deco-preview');
        var prevImg = document.getElementById('dg-deco-preview-img');
        if (prev && prevImg) { prevImg.src = customData.decoImg; prev.style.display = 'block'; }
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
};
window.closeDailyGreetingEditor = function() {
    var modal = document.getElementById('dg-editor-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
};
window.saveDailyGreetingCustom = function() {
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e) {}
    var titleEl = document.getElementById('dg-edit-title');
    var noteEl = document.getElementById('dg-edit-note');
    if (titleEl && titleEl.value.trim()) {
        var titles = titleEl.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        customData.titles = titles;
        customData.title = titles[0];
    } else { delete customData.titles; delete customData.title; }
    if (noteEl && noteEl.value.trim()) {
        var notes = noteEl.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
        customData.notes = notes;
        customData.note = notes[0]; 
    } else { delete customData.notes; delete customData.note; }
    localStorage.setItem('dg_custom_data', JSON.stringify(customData));
    closeDailyGreetingEditor();
    if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
    if (typeof showNotification === 'function') showNotification('公告已保存 ✦', 'success');
};
window.clearDgDecoImg = function() {
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e) {}
    delete customData.decoImg;
    localStorage.setItem('dg_custom_data', JSON.stringify(customData));
    var prev = document.getElementById('dg-deco-preview');
    if (prev) prev.style.display = 'none';
    var wrap = document.getElementById('dg-deco-img-wrap');
    if (wrap) wrap.style.display = 'none';
};
window.clearDgHeaderBg = function() {
    localStorage.removeItem('dg_header_bg');
    var bgEl = document.getElementById('dg-header-band-bg');
    if (bgEl) { bgEl.style.backgroundImage = ''; bgEl.classList.remove('has-img'); }
};

window.onDgOverlayOpacityChange = function(val) {
    var tint = parseInt(val) / 100;
    localStorage.setItem('dg_overlay_bg_tint', tint);
    var valEl = document.getElementById('dg-overlay-opacity-val');
    if (valEl) valEl.textContent = val + '%';
    var tintLayer = document.getElementById('dg-card-tint-overlay');
    if (tintLayer) tintLayer.style.background = 'rgba(0,0,0,' + tint + ')';
};

window.handleDgOverlayBgUpload = function(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var data = ev.target.result;
        localStorage.setItem('dg_overlay_bg', data);
        applyDgOverlayBg(data);
        var prev = document.getElementById('dg-overlay-bg-preview');
        var prevImg = document.getElementById('dg-overlay-bg-preview-img');
        if (prev && prevImg) { prevImg.src = data; prev.style.display = 'block'; }
        var opRow = document.getElementById('dg-overlay-opacity-row');
        if (opRow) opRow.style.display = 'block';
        var savedTint = parseFloat(localStorage.getItem('dg_overlay_bg_tint'));
        var pct = isNaN(savedTint) ? 25 : Math.round(savedTint * 100);
        var slider = document.getElementById('dg-overlay-opacity-slider');
        var valEl = document.getElementById('dg-overlay-opacity-val');
        if (slider) slider.value = pct;
        if (valEl) valEl.textContent = pct + '%';
    };
    reader.readAsDataURL(file);
};

window.clearDgOverlayBg = function() {
    localStorage.removeItem('dg_overlay_bg');
    applyDgOverlayBg(null);
    var prev = document.getElementById('dg-overlay-bg-preview');
    if (prev) prev.style.display = 'none';
    var opRow = document.getElementById('dg-overlay-opacity-row');
    if (opRow) opRow.style.display = 'none';
    if (typeof showNotification === 'function') showNotification('全屏背景已清除', 'success');
};

function applyDgOverlayBg(data, tintOpacity) {
    var card = document.getElementById('daily-greeting-card');
    var bgLayer = document.getElementById('dg-card-bg-layer');
    var tintLayer = document.getElementById('dg-card-tint-overlay');
    if (!card || !bgLayer) return;
    if (tintOpacity === undefined || tintOpacity === null) {
        var saved = parseFloat(localStorage.getItem('dg_overlay_bg_tint'));
        tintOpacity = isNaN(saved) ? 0.25 : saved;
    }
    if (data) {
        bgLayer.style.backgroundImage = 'url(' + data + ')';
        bgLayer.style.opacity = '1';
        if (tintLayer) tintLayer.style.background = 'rgba(0,0,0,' + tintOpacity + ')';
        card.classList.add('has-card-bg');
        card.style.backgroundImage = '';
        card.style.backgroundSize = '';
        card.style.backgroundPosition = '';
        card.style.backgroundRepeat = '';
    } else {
        bgLayer.style.backgroundImage = '';
        bgLayer.style.opacity = '';
        if (tintLayer) tintLayer.style.background = 'rgba(0,0,0,0)';
        card.classList.remove('has-card-bg');
    }
}

(function() {
    var savedOverlayBg = localStorage.getItem('dg_overlay_bg');
    if (savedOverlayBg) {
        document.addEventListener('DOMContentLoaded', function() {
            applyDgOverlayBg(savedOverlayBg);
            var prev = document.getElementById('dg-overlay-bg-preview');
            var prevImg = document.getElementById('dg-overlay-bg-preview-img');
            if (prev && prevImg) { prevImg.src = savedOverlayBg; prev.style.display = 'block'; }
            var opRow = document.getElementById('dg-overlay-opacity-row');
            if (opRow) opRow.style.display = 'block';
            var savedOp = parseFloat(localStorage.getItem('dg_overlay_bg_tint'));
            var pct = isNaN(savedOp) ? 25 : Math.round(savedOp * 100);
            var slider = document.getElementById('dg-overlay-opacity-slider');
            var valEl = document.getElementById('dg-overlay-opacity-val');
            if (slider) slider.value = pct;
            if (valEl) valEl.textContent = pct + '%';
        });
    }
})();

window.switchToAnnouncementPanel = function() {
    var listArea = document.getElementById('custom-replies-list');
    var annPanel = document.getElementById('announcement-panel');
    var toolbar = document.getElementById('cr-toolbar');
    var batchToolbar = document.getElementById('batch-ops-toolbar');
    var subTabs = document.getElementById('cr-sub-tabs');
    var addBtn = document.getElementById('add-custom-reply');
    var titleEl = document.getElementById('cr-modal-title');
    if (listArea) { listArea.style.display = 'none'; listArea.innerHTML = ''; listArea.className = 'content-list-area'; }
    if (batchToolbar) { batchToolbar.style.display = 'none'; batchToolbar.innerHTML = ''; }
    if (subTabs) { subTabs.style.display = 'none'; subTabs.innerHTML = ''; }
    if (annPanel) { annPanel.style.display = 'block'; annPanel.scrollTop = 0; }
    if (toolbar) toolbar.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
    if (titleEl) titleEl.textContent = '今日公告配置';
    var customData = {};
    try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(e2) {}
    var titleInput = document.getElementById('dg-edit-title');
    var noteInput = document.getElementById('dg-edit-note');
    if (titleInput) titleInput.value = (customData.titles && customData.titles.length) ? customData.titles.join('\n') : (customData.title || '');
    if (noteInput) noteInput.value = (customData.notes && customData.notes.length) ? customData.notes.join('\n') : (customData.note || '');
    if (customData.decoImg) {
        var prev = document.getElementById('dg-deco-preview');
        var prevImg = document.getElementById('dg-deco-preview-img');
        if (prev && prevImg) { prevImg.src = customData.decoImg; prev.style.display = 'block'; }
    }
    var savedOverlayBg2 = localStorage.getItem('dg_overlay_bg');
    if (savedOverlayBg2) {
        var overlayPrev = document.getElementById('dg-overlay-bg-preview');
        var overlayPrevImg = document.getElementById('dg-overlay-bg-preview-img');
        if (overlayPrev && overlayPrevImg) { overlayPrevImg.src = savedOverlayBg2; overlayPrev.style.display = 'block'; }
    }
    renderAnnStatusPool();
};

window.renderAnnStatusPool = function() {
    var listEl = document.getElementById('ann-status-pool-list');
    if (!listEl) return;
    var pool = [];
    try { pool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
    listEl.innerHTML = '';
    if (pool.length === 0) {
        listEl.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:10px 0;opacity:0.6;">暂无条目，添加后将随机抽取</div>';
        return;
    }
    pool.forEach(function(item, idx) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;background:linear-gradient(135deg,rgba(var(--accent-color-rgb),0.05),rgba(var(--accent-color-rgb),0.02));border-radius:12px;border:1px solid rgba(var(--accent-color-rgb),0.15);font-size:13px;transition:box-shadow 0.2s;';
        var iconHtml = item.iconImg
            ? '<img src="' + item.iconImg + '" style="width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
            : '<span style="font-size:18px;min-width:26px;text-align:center;flex-shrink:0;">' + (item.icon || '✦') + '</span>';
        row.innerHTML = iconHtml
            + '<div style="flex:1;min-width:0;">'
            + '<div style="color:var(--text-primary);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (item.status || '—') + '</div>'
            + (item.label ? '<div style="color:var(--accent-color);font-size:10px;letter-spacing:1.5px;margin-top:2px;opacity:0.8;">' + item.label + '</div>' : '')
            + '</div>'
            + '<button onclick="removeAnnStatusPoolItem(' + idx + ')" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:3px 5px;border-radius:6px;opacity:0.6;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">✕</button>';
        listEl.appendChild(row);
    });
};

window.addAnnStatusPoolItem = function() {
    var statusInput = document.getElementById('ann-status-pool-input');
    var labelInput = document.getElementById('ann-status-label-input');
    var iconInput = document.getElementById('ann-status-icon-input');
    var status = statusInput ? statusInput.value.trim() : '';
    var label = labelInput ? labelInput.value.trim() : '';
    var icon = iconInput ? iconInput.value.trim() : '';
    var iconImg = iconInput ? (iconInput.dataset.imgSrc || '') : '';
    if (!status && !label) { if (typeof showNotification === 'function') showNotification('请至少填写状态或标签', 'warning'); return; }
    var pool = [];
    try { pool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
    var entry = { status: status, label: label, icon: icon || '✦' };
    if (iconImg) entry.iconImg = iconImg;
    pool.push(entry);
    localStorage.setItem('dg_status_pool', JSON.stringify(pool));
    if (statusInput) statusInput.value = '';
    if (labelInput) labelInput.value = '';
    if (iconInput) { iconInput.value = ''; delete iconInput.dataset.imgSrc; }
    renderAnnStatusPool();
    if (typeof showNotification === 'function') showNotification('已添加到随机库', 'success');
};

window.handleAnnStatusIconUpload = function(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var iconInput = document.getElementById('ann-status-icon-input');
        if (iconInput) {
            iconInput.dataset.imgSrc = ev.target.result;
            iconInput.value = '[图片]';
            iconInput.style.fontSize = '10px';
        }
    };
    reader.readAsDataURL(file);
};

window.removeAnnStatusPoolItem = function(idx) {
    var pool = [];
    try { pool = JSON.parse(localStorage.getItem('dg_status_pool') || '[]'); } catch(e2) {}
    pool.splice(idx, 1);
    localStorage.setItem('dg_status_pool', JSON.stringify(pool));
    renderAnnStatusPool();
};

document.addEventListener('DOMContentLoaded', function() {
    var headerInput = document.getElementById('dg-header-img-input');
    if (headerInput) {
        headerInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var data = ev.target.result;
                localStorage.setItem('dg_header_bg', data);
                var bgEl = document.getElementById('dg-header-band-bg');
                if (bgEl) { bgEl.style.backgroundImage = 'url(' + data + ')'; bgEl.classList.add('has-img'); }
            };
            reader.readAsDataURL(file);
        });
    }
    var decoInput = document.getElementById('dg-deco-img-input');
    if (decoInput) {
        decoInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                var data = ev.target.result;
                var customData = {};
                try { customData = JSON.parse(localStorage.getItem('dg_custom_data') || '{}'); } catch(ex) {}
                customData.decoImg = data;
                localStorage.setItem('dg_custom_data', JSON.stringify(customData));
                var prev = document.getElementById('dg-deco-preview');
                var prevImg = document.getElementById('dg-deco-preview-img');
                if (prev && prevImg) { prevImg.src = data; prev.style.display = 'block'; }
            };
            reader.readAsDataURL(file);
        });
    }
});

window.updateDynamicNames = function() {
    try {
        var pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
        var mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';

        var tabPartner = document.getElementById('mood-tab-partner');
        if (tabPartner) tabPartner.textContent = pName + '的记录';
        var tabMe = document.getElementById('mood-tab-me');
        if (tabMe) tabMe.textContent = mName + '的记录';

        var detailPartnerTitle = document.getElementById('detail-partner-title');
        if (detailPartnerTitle) detailPartnerTitle.textContent = pName + '的';

        var partnerNoRec = document.getElementById('detail-partner-no-record');
        if (partnerNoRec) {
            var msgEl = partnerNoRec;
            if (!msgEl.querySelector('span')) msgEl.textContent = pName + ' 这天还没有留下记录';
        }

        var editPartnerBtn = document.getElementById('edit-partner-mood');
        if (editPartnerBtn) editPartnerBtn.textContent = '修改' + pName;
        var deletePartnerBtn = document.getElementById('delete-partner-mood');
        if (deletePartnerBtn) deletePartnerBtn.textContent = '删除' + pName;

        var continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.title = '让' + pName + '继续说';

        var envInfo = document.querySelector('.env-send-info');
        if (envInfo) {
            var textNodes = Array.from(envInfo.childNodes).filter(n => n.nodeType === 3);
            textNodes.forEach(function(n) {
                if (n.textContent.includes('对方将在') || n.textContent.includes('小时内回信')) {
                    n.textContent = pName + ' 将在 10-24 小时内回信（8-12 句话）';
                }
            });
        }

        setDgLabel('dg-section-label-partner', pName + ' 今日状态');
        setDgLabel('dg-weather-label', pName + ' 的天气');
        setDgLabel('dg-status-label', pName + ' 的状态');

        var envInfoSpan = document.getElementById('env-reply-time-info');
        if (envInfoSpan) envInfoSpan.textContent = pName + ' 将在 10-24 小时内回信（8-12 句话）';

        var pokeInput = document.getElementById('poke-input');
        if (pokeInput) pokeInput.placeholder = '例如：拍了拍"' + pName + '"的肩膀';

        document.querySelectorAll('[data-name-partner]').forEach(function(el) {
            el.textContent = pName + '的记录';
        });
        document.querySelectorAll('[data-name-me]').forEach(function(el) {
            el.textContent = mName + '的记录';
        });
        document.querySelectorAll('[data-delete-partner]').forEach(function(el) {
            el.textContent = '删除' + pName;
        });
        document.querySelectorAll('[data-edit-partner]').forEach(function(el) {
            el.textContent = '修改' + pName;
        });
    } catch(e) { console.warn('updateDynamicNames error:', e); }
};
function setDgLabel(id, txt) {
    var el = document.getElementById(id);
    if (el && el.tagName !== 'INPUT') el.textContent = txt;
}

window.closeDailyGreeting = function() {
    try {
        var modal = document.getElementById('daily-greeting-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            setTimeout(function() {
                modal.classList.add('hidden');
                modal.style.opacity = '';
                modal.style.transition = '';
            }, 320);
        }
        localStorage.setItem('dailyGreetingShown', new Date().toDateString());
    } catch(e) {}
};

window.reopenDailyGreeting = function() {
    try {
        if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
        var modal = document.getElementById('daily-greeting-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.classList.remove('hidden');
            requestAnimationFrame(function() {
                modal.style.transition = 'opacity 0.3s ease';
                modal.style.opacity = '1';
            });
        }
    } catch(e) {}
};

window.tryShowDailyGreeting = function() {
    try {
        if (localStorage.getItem('dailyGreetingShown') === new Date().toDateString()) return;

        var now = new Date();
        var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        var moodDataRaw = window.moodData || {};
        var todayMood = moodDataRaw[todayStr];

        if (!todayMood || !todayMood.partner) {
            setTimeout(function() {
                var refreshedMood = (window.moodData || {})[todayStr];
                _buildDailyGreeting(); 
                var modal = document.getElementById('daily-greeting-modal');
                if (modal) modal.classList.remove('hidden');
                localStorage.setItem('dailyGreetingShown', new Date().toDateString());
            }, 45000);
            return;
        }

        _buildDailyGreeting();
        var modal = document.getElementById('daily-greeting-modal');
        if (modal) modal.classList.remove('hidden');
    } catch(e) { console.warn('Daily greeting show error:', e); }
};

        function safeGetItem(key) {
            try { return localStorage.getItem(key); }
            catch (e) { console.error('Error getting item:', e); return null; }
        }

        function safeSetItem(key, value) {
            try {
                if (typeof value === 'object') value = JSON.stringify(value);
                localStorage.setItem(key, value);
            } catch (e) { console.error('Error setting item:', e); }
        }

        function safeRemoveItem(key) {
            try { localStorage.removeItem(key); }
            catch (e) { console.error('Error removing item:', e); }
        }

function getRandomItem(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeStringStrict(s) {
    if (typeof s !== 'string') return '';
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function deduplicateContentArray(arr, baseSystemArray = []) {
    const seen = new Set(baseSystemArray.map(normalizeStringStrict));
    const result = [];
    let removedCount = 0;
    for (const item of arr) {
        const norm = normalizeStringStrict(item);
        if (norm !== '' && !seen.has(norm)) {
            seen.add(norm);
            result.push(item);
        } else {
            removedCount++;
        }
    }
    return { result, removedCount };
}

        function cropImageToSquare(file, maxSize = 640) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const minSide = Math.min(img.width, img.height);
                        const sx = (img.width - minSide) / 2;
                        const sy = (img.height - minSide) / 2;
                        const canvas = document.createElement('canvas');
                        canvas.width = maxSize; canvas.height = maxSize;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function exportDataToMobileOrPC(dataString, fileName) {
            if (navigator.share && navigator.canShare) {
                try {
                    const blob = new Blob([dataString], { type: 'application/json' });
                    const file = new File([blob], fileName, { type: 'application/json' });
                    if (navigator.canShare({ files: [file] })) {
                        navigator.share({ files: [file], title: '传讯数据备份', text: '请选择"保存到文件"' })
                            .catch(() => downloadFileFallback(blob, fileName));
                        return;
                    }
                } catch (e) {}
            }
            const blob = new Blob([dataString], { type: 'application/json' });
            downloadFileFallback(blob, fileName);
        }

        function downloadFileFallback(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = fileName; link.style.display = 'none';
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        if (typeof localforage !== 'undefined') {
            localforage.config({
                driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
                name: 'ChatApp_V3', version: 1.0, storeName: 'chat_data',
                description: 'Storage for Chat App V3'
            });
        } else {
            console.warn('[storage] localforage 未加载，IndexedDB 能力不可用，将退回 localStorage/内存兜底');
        }

        function showNotification(message, type = 'info', duration = 3000) {
            const existing = document.querySelector('.notification');
            if (existing) existing.remove();
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            const iconMap = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
            notification.innerHTML = `<i class="fas ${iconMap[type] || 'fa-info-circle'}"></i><span>${message}</span>`;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.classList.add('hiding');
                notification.addEventListener('animationend', () => notification.remove());
            }, duration);
        }

        let _currentAudioContext = null;
        let _currentAudio = null;

        const stopCurrentSound = () => {
            try {
                if (_currentAudio) {
                    _currentAudio.pause();
                    _currentAudio.currentTime = 0;
                    _currentAudio = null;
                }
                if (_currentAudioContext) {
                    _currentAudioContext.close();
                    _currentAudioContext = null;
                }
            } catch(e) {}
        };

        const playSound = (type) => {
            if (!settings.soundEnabled) return;
            stopCurrentSound();
            try {
                // =============== 两方音效配置 ===============
                const category = (() => {
                    // 新类型（按两方区分）
                    if (type === 'my_send') return 'my_send';
                    if (type === 'partner_message') return 'partner_message';
                    if (type === 'my_poke') return 'my_poke';
                    if (type === 'partner_poke') return 'partner_poke';
                    // 兼容旧调用
                    if (type === 'send') return 'my_send';
                    if (type === 'message') return 'partner_message';
                    if (type === 'poke') return 'my_poke';
                    return null;
                })();

                const customUrlByCategory = (() => {
                    if (!category) return '';
                    if (category === 'my_send') return settings.mySendCustomSoundUrl || '';
                    if (category === 'partner_message') return settings.partnerMessageCustomSoundUrl || '';
                    if (category === 'my_poke') return settings.myPokeCustomSoundUrl || '';
                    if (category === 'partner_poke') return settings.partnerPokeCustomSoundUrl || '';
                    return '';
                })();

                const legacyCustomUrl = (settings.customSoundUrl || '').trim();
                const resolvedCustomUrlBase = (customUrlByCategory && customUrlByCategory.trim())
                    ? customUrlByCategory.trim()
                    : legacyCustomUrl;

                const KAKAO_TALK_URL = 'https://image.uglycat.cc/jl5xf9.mp3';

                // 预设音效（无音效 / kakaoTalk）需要优先级高于自定义 URL
                const presetId = (() => {
                    if (!category) return '';
                    if (category === 'my_send') return settings.mySendSoundPreset || 'tone_low';
                    if (category === 'partner_message') return settings.partnerMessageSoundPreset || 'tone_low';
                    if (category === 'my_poke') return settings.myPokeSoundPreset || 'tone_low';
                    if (category === 'partner_poke') return settings.partnerPokeSoundPreset || 'tone_low';
                    return 'tone_low';
                })();

                if (presetId === 'mute') return;

                // kakaoTalk 作为"固定预设"，选择它就播放对应音频
                let resolvedCustomUrl = (presetId === 'kakaotalk') ? KAKAO_TALK_URL : resolvedCustomUrlBase;

                // 自定义 URL：只要填了就直接播放（不区分内置/预设）
                if (resolvedCustomUrl) {
                    const audio = new Audio(resolvedCustomUrl);
                    audio.volume = Math.min(1, Math.max(0, settings.soundVolume || 0.15));
                    _currentAudio = audio;
                    audio.play().catch(() => {});
                    audio.addEventListener('ended', () => { _currentAudio = null; });
                    return;
                }

                // =============== 内置合成音效（两方 + 预设） ===============
                const CATEGORY_BASE = {
                    my_send: { osc1Type: 'triangle', osc2Type: 'sine', freq: 520, dur: 0.18, up: 1.06, down: 0.72 },
                    partner_message: { osc1Type: 'triangle', osc2Type: 'sine', freq: 460, dur: 0.2, up: 1.04, down: 0.74 },
                    my_poke: { osc1Type: 'sawtooth', osc2Type: 'triangle', freq: 400, dur: 0.16, up: 1.08, down: 0.76 },
                    partner_poke: { osc1Type: 'sawtooth', osc2Type: 'triangle', freq: 380, dur: 0.16, up: 1.08, down: 0.76 }
                };

                const PRESET_EFFECTS = {
                    // 预设 effect：允许覆盖波形与倍率（不填则沿用基础音色）
                    tone_default: { osc1Type: 'triangle', osc2Type: 'sine', fMul: 0.92, durMul: 1.08, upMul: 1.0, downMul: 0.95 },
                    tone_soft: { osc1Type: 'sine', osc2Type: 'triangle', fMul: 0.88, durMul: 1.15, upMul: 0.98, downMul: 0.92 },
                    tone_low: { osc1Type: 'sawtooth', osc2Type: 'triangle', fMul: 0.78, durMul: 1.2, upMul: 0.96, downMul: 0.88 },
                    tone_warm: { osc1Type: 'triangle', osc2Type: 'triangle', fMul: 0.84, durMul: 1.1, upMul: 0.98, downMul: 0.9 },
                    tone_dark: { osc1Type: 'square', osc2Type: 'triangle', fMul: 0.72, durMul: 1.25, upMul: 0.95, downMul: 0.85 },
                    tone_haze: { osc1Type: 'sine', osc2Type: 'square', fMul: 0.8, durMul: 1.18, upMul: 0.97, downMul: 0.9 }
                };

                // presetId 已在上方计算

                const cfg = (() => {
                    if (category && CATEGORY_BASE[category]) {
                        const base = CATEGORY_BASE[category];
                        const fx = PRESET_EFFECTS[presetId] || PRESET_EFFECTS.tone_default;
                        const osc1Type = (typeof fx.osc1Type === 'string') ? fx.osc1Type : base.osc1Type;
                        const osc2Type = (typeof fx.osc2Type === 'string') ? fx.osc2Type : base.osc2Type;
                        const freq = base.freq * (fx.fMul || 1);
                        const dur = base.dur * (fx.durMul || 1);
                        const up = base.up * (fx.upMul || 1);
                        const down = base.down * (fx.downMul || 1);
                        return { osc1Type, osc2Type, freq, dur, up, down };
                    }

                    // 兼容其它旧声音类型（不走两方预设）
                    if (type === 'favorite') return { osc1Type: 'sine', osc2Type: 'sine', freq: 1200, dur: 0.18, up: 1.06, down: 0.70 };
                    if (type === 'mood') return { osc1Type: 'sine', osc2Type: 'square', freq: 440, dur: 0.16, up: 1.12, down: 0.60 };
                    if (type === 'import') return { osc1Type: 'square', osc2Type: 'triangle', freq: 330, dur: 0.16, up: 1.25, down: 0.70 };
                    if (type === 'export') return { osc1Type: 'triangle', osc2Type: 'sine', freq: 520, dur: 0.16, up: 1.15, down: 0.66 };
                    if (type === 'error') return { osc1Type: 'sawtooth', osc2Type: 'square', freq: 180, dur: 0.14, up: 1.03, down: 0.42 };
                    return { osc1Type: 'sine', osc2Type: 'triangle', freq: 600, dur: 0.15, up: 1.05, down: 0.60 };
                })();

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                _currentAudioContext = audioContext;
                const gainNode = audioContext.createGain();
                const vol = Math.min(0.55, Math.max(0.01, settings.soundVolume || 0.1));

                // 叠加一层泛音让音色更"厚"
                const osc1 = audioContext.createOscillator();
                const osc2 = audioContext.createOscillator();

                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(audioContext.destination);

                const now = audioContext.currentTime;
                gainNode.gain.setValueAtTime(vol, now);

                const jitter = (Math.random() - 0.5) * 0.02; // 轻微随机
                const f1 = cfg.freq * (1 + jitter);
                const f2 = f1 * 2;

                osc1.type = cfg.osc1Type;
                osc2.type = cfg.osc2Type;

                osc1.frequency.setValueAtTime(f1, now);
                osc2.frequency.setValueAtTime(f2, now);

                // 频率滑动 + 音量包络
                osc1.frequency.exponentialRampToValueAtTime(f1 * cfg.up, now + 0.04);
                osc2.frequency.exponentialRampToValueAtTime(f2 * (cfg.up - 0.03), now + 0.04);

                osc1.frequency.exponentialRampToValueAtTime(f1 * cfg.down, now + cfg.dur);
                osc2.frequency.exponentialRampToValueAtTime(f2 * cfg.down, now + cfg.dur);

                const end = now + cfg.dur;
                osc1.start(now);
                osc2.start(now);

                gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

                osc1.stop(end);
                osc2.stop(end);
                audioContext.addEventListener('statechange', () => {
                    if (audioContext.state === 'closed') _currentAudioContext = null;
                });
            } catch (e) { console.warn("音频播放失败:", e); }
        };

        const throttledSaveData = () => {
            if (typeof saveTimeout !== 'undefined') clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                try {
                    const maybePromise = saveData();
                    if (maybePromise && typeof maybePromise.catch === 'function') {
                        maybePromise.catch(e => console.error('[throttledSaveData] 保存失败:', e));
                    }
                } catch (e) {
                    console.error('[throttledSaveData] 保存失败:', e);
                }
            }, 500);
        };
        window.throttledSaveData = throttledSaveData;

async function applyCustomFont(url) {
    if (!url || !url.trim()) {
        document.documentElement.style.removeProperty('--font-family');
        document.documentElement.style.removeProperty('--message-font-family');
        return;
    }
    const fontName = 'UserCustomFont';
    try {
        const font = new FontFace(fontName, `url(${url})`);
        await font.load();
        document.fonts.add(font);
        const fontStack = `"${fontName}", 'Noto Serif SC', serif`;
        document.documentElement.style.setProperty('--font-family', fontStack);
        document.documentElement.style.setProperty('--message-font-family', fontStack);
        if (typeof settings !== 'undefined') settings.messageFontFamily = fontStack;
    } catch (e) {
        console.error('字体加载失败:', e);
        showNotification('字体加载失败，请检查链接是否有效', 'error');
    }
}

function applyCustomBubbleCss(cssCode) {
    const styleId = 'user-custom-bubble-style';
    let styleTag = document.getElementById(styleId);
    if (!cssCode || !cssCode.trim()) { if (styleTag) styleTag.remove(); return; }
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; }
    document.head.appendChild(styleTag);

    function boostSpecificity(css) {
        return css.replace(/([^{}@][^{}]*)\{([^{}]*)\}/g, (match, rawSel, body) => {
            const selectors = rawSel.split(',').map(s => s.trim()).filter(Boolean);
            const boosted = selectors.map(sel => {
                if (sel.startsWith('html') || sel.startsWith('@') || sel.startsWith('from') || sel.startsWith('to') || /^\d/.test(sel)) return sel;
                return `html body ${sel}`;
            });
            return `${boosted.join(', ')} {${body}}`;
        });
    }

    const boostedCss = boostSpecificity(cssCode);

    styleTag.textContent = boostedCss + `
/* image bubble reset — must stay !important */
html[data-theme] .message.message-image-bubble-none,
html body .message.message-image-bubble-none {
    background: transparent !important; border: none !important;
    box-shadow: none !important; padding: 0 !important; border-radius: 0 !important;
}`;

    try {
        const alreadyCustomized = (typeof settings !== 'undefined' && settings.customThemeColors) ? settings.customThemeColors : {};
        const sentMatch  = cssCode.match(/\.message-sent\s*\{([^}]*)\}/);
        const recvMatch  = cssCode.match(/\.message-received\s*\{([^}]*)\}/);
        if (sentMatch && !alreadyCustomized['--message-sent-text']) {
            const colorLine = sentMatch[1].match(/\bcolor\s*:\s*([^;}\n]+)/);
            if (colorLine) {
                const v = colorLine[1].trim().replace(/!important/g,'').trim();
                if (v && !v.startsWith('var(')) {
                    document.documentElement.style.setProperty('--message-sent-text', v);
                }
            }
        }
        if (recvMatch && !alreadyCustomized['--message-received-text']) {
            const colorLine = recvMatch[1].match(/\bcolor\s*:\s*([^;}\n]+)/);
            if (colorLine) {
                const v = colorLine[1].trim().replace(/!important/g,'').trim();
                if (v && !v.startsWith('var(')) {
                    document.documentElement.style.setProperty('--message-received-text', v);
                }
            }
        }
    } catch(e) {}
}

function applyGlobalThemeCss(cssCode) {
    const styleId = 'user-custom-global-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!cssCode || !cssCode.trim()) { if (styleTag) styleTag.remove(); return; }
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
    styleTag.textContent = cssCode;
}

async function exportAllData() {
    try {
        if (typeof ChatBackup !== 'undefined' && ChatBackup.buildBackupPayload && ChatBackup.serializeBackupV4) {
            const payload = await ChatBackup.buildBackupPayload({
                inclMsgs: true,
                inclSet: true,
                inclCustom: true,
                inclThemes: true,
                inclDg: true,
                inclStickers: true,
                inclHome: true,
                inclMoyu: true,
                inclShop: true,
                inclMoments: true,
                inclMap: true,
                inclTaPhone: true,
                inclPet: true,
                inclDiary: true,
                inclAccounting: true,
                inclEnvelope: true,
                inclMood: true,
                inclTarot: true,
                inclCall: true,
                inclGroupChat: true,
                inclSpark: true,
                inclFeatures: true,
                inclCoreExtra: true,
                inclOnboarding: true
            });
            const jsonString = ChatBackup.serializeBackupV4(payload);
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `chatapp-backup-${dateStr}.json`;
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            downloadFileFallback(blob, fileName);
            if (typeof showNotification === 'function') showNotification('已导出 JSON 备份', 'success');
        } else {
            showNotification('备份模块或函数未加载，请刷新页面', 'error');
        }
    } catch (e) {
        console.error('全量导出失败:', e);
        showNotification('全量导出失败，请重试', 'error');
    }
}

async function importAllData(file) {
    if (!file) return;
    if (file.size > 220 * 1024 * 1024) {
        showNotification('文件过大（>220MB），请确认是否为正确备份', 'error');
        return;
    }
    try {
        if (typeof ChatBackup === 'undefined' || !ChatBackup.loadBackupFromFile || !ChatBackup.applyBackupToStorage) {
            showNotification('备份模块未加载，请刷新页面重试', 'error');
            return;
        }
        const data = await ChatBackup.loadBackupFromFile(file);
        const fullLike = ChatBackup.isFullBackupShape
            ? ChatBackup.isFullBackupShape(data)
            : (
                data.type === 'full' ||
                (typeof data.type === 'string' && data.type.includes('full-backup')) ||
                !!data.indexedDB ||
                !!data.localforage
            );
        if (!fullLike) {
            if (typeof importChatHistory === 'function') importChatHistory(file);
            return;
        }
        if (!confirm('导入全量备份将按你的选择覆盖对应数据。\n\n头像/背景等如勾选导入会写入备份中的内容。\n\n确定继续吗？')) return;

        const categories = [
            {
                id: 'chat',
                label: '聊天记录 / 会话 / 红包',
                indexedDBNeedles: ['chatMessages', 'sessionList', 'chatSettings', 'showPartnerNameInChat', 'envelopeData', 'pending_envelope'],
                localStorageNeedles: ['groupChatSettings']
            },
            {
                id: 'replies',
                label: '回复 / 拍一拍 / 氛围',
                indexedDBNeedles: ['customReplies', 'customPokes', 'customStatuses', 'customMottos', 'customIntros', 'customEmojis', 'customReplyGroups', 'customPokeGroups', 'customStatusGroups'],
                localStorageNeedles: ['disabledReplyItems', 'pokeSym_my', 'pokeSym_partner', 'pokeSym_my_custom', 'pokeSym_partner_custom']
            },
            {
                id: 'stickers',
                label: '表情库（贴纸）',
                indexedDBNeedles: ['stickerLibrary', 'myStickerLibrary'],
                localStorageNeedles: ['disabledStickerItems']
            },
            {
                id: 'mood',
                label: '心晴手账',
                indexedDBNeedles: ['moodCalendar', 'customMoodOptions', 'moodTrash'],
                localStorageNeedles: []
            },
            {
                id: 'themes',
                label: '主题 / 外观 / 图库',
                indexedDBNeedles: ['customThemes', 'themeSchemes', 'backgroundGallery', 'chatBackground', 'partnerAvatar', 'myAvatar', 'partnerPersonas'],
                localStorageNeedles: []
            },
            {
                id: 'dg',
                label: '每日公告 / 运势 / 天气',
                indexedDBNeedles: [],
                localStorageNeedles: ['dg_custom_data', 'dg_status_pool', 'weekly_fortune', 'daily_fortune'],
                localStoragePrefixes: ['customWeather_']
            },
            {
                id: 'moments',
                label: '朋友圈',
                indexedDBNeedles: [],
                localStorageNeedles: ['moments_data', 'moments_visitor_records', 'moments_friends', 'moments_reply_speed', 'moments_reply_count_min', 'moments_reply_count_max', 'moments_friend_like', 'moments_cover', 'moments_visitor_last_online', 'moments_visitor_last_viewed_count', 'home_avatar_me', 'profile_me']
            },
            {
                id: 'shop',
                label: '商城',
                indexedDBNeedles: [],
                localStorageNeedles: ['shop_balance', 'shop_search_history', 'shop_gift_cabinet', 'shop_products', 'shop_cart', 'shop_orders']
            },
            {
                id: 'diary',
                label: '朝夕心记',
                indexedDBNeedles: ['diaryTodos', 'diaryHabits', 'diaryHabitRecords', 'diaryPeriodRecords', 'diaryAnniversaries', 'diaryTodoCategories'],
                localStorageNeedles: ['diaryPeriodLastReminderDate']
            },
            {
                id: 'accounting',
                label: '同心记账',
                indexedDBNeedles: ['accountingRecords', 'accountingLabels'],
                localStorageNeedles: []
            },
            {
                id: 'taPhone',
                label: 'TA的手机',
                indexedDBNeedles: [],
                localStorageNeedles: ['ta_phone_collections']
            }
        ];

        const pickSelected = () => new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.6);
                backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;
            `;
            overlay.innerHTML = `
                <div style="
                    width:100%;max-width:560px;background:var(--secondary-bg);border-radius:24px 24px 0 0;
                    box-shadow:0 -10px 60px rgba(0,0,0,0.3);
                    padding:16px 18px env(safe-area-inset-bottom,0);
                ">
                    <div style="width:36px;height:4px;border-radius:2px;background:var(--border-color);margin:0 auto 14px;"></div>
                    <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:10px;">全量恢复：选择要导入的部分</div>
                    <div style="display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:auto;padding-right:6px;">
                        ${categories.map(c => {
                            return `
                                <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--primary-bg);">
                                    <span style="font-size:13px;font-weight:700;color:var(--text-primary);">${c.label}</span>
                                    <input type="checkbox" data-cat="${c.id}" checked style="transform:scale(1.1);accent-color:var(--accent-color);">
                                </label>
                            `;
                        }).join('')}
                    </div>
                    <div style="display:flex;gap:10px;margin-top:14px;">
                        <button id="full-imp-cancel" class="modal-btn modal-btn-secondary" style="flex:1;padding:12px 0;">取消</button>
                        <button id="full-imp-confirm" class="modal-btn modal-btn-primary" style="flex:1;padding:12px 0;">确认恢复</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(null); } });
            const fullImpCancelBtn = document.getElementById('full-imp-cancel');
            const fullImpConfirmBtn = document.getElementById('full-imp-confirm');
            if (fullImpCancelBtn) fullImpCancelBtn.onclick = () => { overlay.remove(); resolve(null); };
            if (fullImpConfirmBtn) fullImpConfirmBtn.onclick = () => {
                const selected = Array.from(overlay.querySelectorAll('input[type=checkbox]:checked'))
                    .map(i => i.dataset.cat);
                overlay.remove();
                resolve(selected);
            };
        });

        const selectedCats = await pickSelected();
        if (!selectedCats || selectedCats.length === 0) return;

        showNotification('正在恢复数据…', 'info', 3000);
        await ChatBackup.applyBackupToStorage(data, {
            selective: true,
            selectedCategoryIds: selectedCats,
            categories
        });

        showNotification('恢复完成，即将刷新页面…', 'success', 2000);
        setTimeout(() => location.reload(), 2200);
    } catch (err) {
        console.error('全量导入失败:', err);
        const msg = err && err.message ? err.message : '未知错误';
        showNotification('导入失败：' + msg, 'error', 5000);
    }
}
