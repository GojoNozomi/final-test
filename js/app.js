// 🤫 强行注入空函数代理，彻底封印 listeners.js 找不到 onboarding 导致的红字报错
window.setupTutorialListeners = function() {};
window.startTour = function() {};

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

    // 🌟 全自动动态同步大炮：网页启动时自动剥离旧内存，强行同步 Gist 最新外链
    async function injectGistStickers() {
        try {
            /* 🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟
               【更 换 表 情 包 Gist 网 址 的 位 置】：以后有更新直接修改下面这一行的链接即可！
               🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟 */
            let myStickerGistUrl = 'https://gist.githubusercontent.com/yvainewen/9ed769a74214b6b52f5dd44b2bb4638c/raw/stickers.json';
            
            let response = await fetch(myStickerGistUrl, { cache: 'no-store' }); 
            if (response.ok) {
                let jsonReceived = await response.json();
                
                // 🌀【核心破局 · 上帝全景递归扫描法】：
                // 彻底无视外部包裹是数组还是对象，只要底层有任意以 http 开头的长网址字符串，通通碾压式抓取归位！
                function extractUrlsRecursively(node) {
                    let results = [];
                    if (!node) return results;
                    if (typeof node === 'string') {
                        let str = node.trim();
                        if (str.startsWith('http')) results.push(str);
                    } else if (Array.isArray(node)) {
                        for (let i = 0; i < node.length; i++) {
                            results = results.concat(extractUrlsRecursively(node[i]));
                        }
                    } else if (typeof node === 'object') {
                        for (let key in node) {
                            if (node.hasOwnProperty(key)) {
                                results = results.concat(extractUrlsRecursively(node[key]));
                            }
                        }
                    }
                    return results;
                }
                
                let allUrls = extractUrlsRecursively(jsonReceived);
                let cleanList = [...new Set(allUrls)]; // 指针级去重机制
                
                // 🔥【物理防爆安全锁】：采用原地清空再推入的方式，完美避开 const 带来的赋值死锁报错
                if (typeof stickerLibrary !== 'undefined' && Array.isArray(stickerLibrary)) {
                    stickerLibrary.length = 0;
                    stickerLibrary.push(...cleanList);
                } else {
                    window.stickerLibrary = cleanList;
                }

                if (typeof myStickerLibrary !== 'undefined' && Array.isArray(myStickerLibrary)) {
                    myStickerLibrary.length = 0;
                    myStickerLibrary.push(...cleanList);
                } else {
                    window.myStickerLibrary = cleanList;
                }
                
                // 挂载全局影子代理
                window._stickerLibrary = window.stickerLibrary;
                
                console.log('✓ 赛博记忆：已成功同步 Gist 永久外链表情库，共计 ' + cleanList.length + ' 个！');
            }
        } catch(e) {
            console.warn('Gist 外链自动同步失败，启动备用空库防止闪退:', e);
        }
    }

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

        updateLoader('正在自动同步 Gist 永久表情库...', '60%');
        await injectGistStickers();

        updateLoader('正在渲染我们的世界...', '80%');
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
                        if (typeof startTour === 'function') startTour();
                    }, { once: true });
                }
            }
        }

        updateLoader('连接成功，欢迎回来。', '100%');
        setTimeout(hideWelcomeScreen, 3500);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                try { if (typeof saveTimeout !== 'undefined') clearTimeout(saveTimeout); } catch (e) {}
                try { _backupCriticalData(); } catch (e) { console.warn('[visibilitychange] 紧急备份失败:', e); }
                try {
                    const p = saveData();
                    if (p && typeof p.catch === 'function') {
                        p.catch(e => console.error('[visibilitychange] 保存失败:', e));
                    }
                } catch (e) { console.error('[visibilitychange] 保存失败:', e); }
            } else if (document.visibilityState === 'visible') {
                try {
                    const backup = typeof _tryRecoverFromBackup === 'function' ? _tryRecoverFromBackup() : null;
                    if (backup && Array.isArray(backup.messages) && backup.messages.length > 0 && Array.isArray(messages) && backup.messages.length > messages.length) {
                        console.warn('[visibilitychange] 检测到备份消息比当前更多，自动尝试恢复');
                        try {
                            messages = backup.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
                            if (backup.settings) Object.assign(settings, backup.settings);
                            if (typeof updateUI === 'function') updateUI();
                            if (typeof throttledSaveData === 'function') throttledSaveData();
                            showNotification('已自动恢复本地临时备份内容', 'warning', 3500);
                        } catch (restoreErr) { console.warn('[visibilitychange] 自动恢复失败:', restoreErr); }
                    }
                } catch (e) { console.warn('[visibilitychange] 恢复备份失败:', e); }
            }
        });

        window.addEventListener('pagehide', () => { try { _backupCriticalData(); } catch (e) {} });
        window.addEventListener('beforeunload', () => { try { _backupCriticalData(); } catch (e) {} });

        setInterval(() => { saveData().catch(e => console.warn('[autoBackup] 定时保存失败:', e)); }, 3 * 60 * 1000);

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

    } catch (err) {
        console.error('严重初始化错误:', err);
        updateLoader('加载遇到问题，已强制进入...', '100%');
        setTimeout(hideWelcomeScreen, 3500);
    }
});

// 🚀 追加按钮外链化劫持
const stickerInput = document.getElementById('sticker-file-input');
if (stickerInput) {
    stickerInput.addEventListener('click', async (e) => {
        e.preventDefault(); 
        const url = prompt("🔗 【追加新外链表情】\n请粘贴你想额外添加的表情包图片 URL 地址：");
        if (url && url.trim()) {
            const cleanUrl = url.trim();
            if(typeof stickerLibrary !== 'undefined') {
                stickerLibrary.push(cleanUrl);
                window._stickerLibrary = stickerLibrary;
            }
            if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
            if (typeof showNotification === 'function') showNotification('✓ 额外追加外链表情成功！', 'success');
        }
    });
}

const myStickerQuickUpload = document.getElementById('my-sticker-quick-upload');
if (myStickerQuickUpload) {
    myStickerQuickUpload.addEventListener('click', async (e) => {
        e.preventDefault(); 
        const url = prompt("🔗 【追加快捷表情】\n请粘贴图片 URL 地址：");
        if (url && url.trim()) {
            const cleanUrl = url.trim();
            if(typeof myStickerLibrary !== 'undefined') myStickerLibrary.push(cleanUrl);
            if (typeof throttledSaveData === 'function') throttledSaveData();
            if (typeof renderComboContent === 'function') renderComboContent('my-sticker');
            if (typeof showNotification === 'function') showNotification('✓ 已成功追加至快捷栏！', 'success');
        }
    });
}

window.addEventListener('load', function() {
    setTimeout(function() {
        try {
            if (localStorage.getItem('dailyGreetingShown') === new Date().toDateString()) return;
            try { if (typeof checkPartnerDailyMood === 'function') checkPartnerDailyMood(); } catch(e2) {}
            if (typeof _buildDailyGreeting === 'function') _buildDailyGreeting();
            var modal = document.getElementById('daily-greeting-modal');
            if (modal) modal.classList.remove('hidden');
            localStorage.setItem('dailyGreetingShown', new Date().toDateString());
        } catch(e) {}
    }, 4500);
}, { once: true });

// 🚀 戳一戳双向包裹器
(function() {
    var MY_SYM_KEY   = 'pokeSym_my'; var PTR_SYM_KEY  = 'pokeSym_partner';
    var MY_CUST_KEY  = 'pokeSym_my_custom'; var PTR_CUST_KEY = 'pokeSym_partner_custom';
    var PRESETS = [
        { value: 'none', label: '无装饰', sym: '' }, { value: 'star4', label: '✦ 四角星', sym: '✦' },
        { value: 'star5', label: '✧ 镂空星', sym: '✧' }, { value: 'dot', label: '· 圆点', sym: '·' },
        { value: 'wave', label: '～ 波浪', sym: '～' }, { value: 'heart', label: '♡ 爱心', sym: '♡' },
        { value: 'flower', label: '✿ 花朵', sym: '✿' }, { value: 'sparkle', label: '✨ 闪光', sym: '✨' },
        { value: 'custom', label: '自定义…', sym: null }
    ];
    window._formatPokeText = function(text) { 
        var v = localStorage.getItem(MY_SYM_KEY) || 'star4'; 
        var sym = v === 'custom' ? (localStorage.getItem(MY_CUST_KEY) || '✦') : (PRESETS.find(x=>x.value===v)||{}).sym; 
        return sym ? (sym + ' ' + text + ' ' + sym) : text; 
    };
    window._formatPartnerPokeText = function(text) { 
        var v = localStorage.getItem(PTR_SYM_KEY) || 'star4'; 
        var sym = v === 'custom' ? (localStorage.getItem(PTR_CUST_KEY) || '✦') : (PRESETS.find(x=>x.value===v)||{}).sym; 
        return sym ? (sym + ' ' + text + ' ' + sym) : text; 
    };
    window._sanitizePokeTextForDisplay = s => String(s||'').replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/gu, '').trim();
})();

// 🚀 给原生遗留全局变量进行硬核托底防死锁
if (typeof safeGetItem === 'undefined') {
    window.safeGetItem = function(k) { try{return localStorage.getItem(k)}catch(e){return null} };
    window.safeSetItem = function(k,v) { try{localStorage.setItem(k,typeof v==='object'?JSON.stringify(v):v)}catch(e){} };
    window.safeRemoveItem = function(k) { try{localStorage.removeItem(k)}catch(e){} };
}

// 🚀 专治苹果拦截：全局推送授权唤醒大炮
window.requestApplePushPermission = async function() {
    const pushToggle = document.getElementById('push-notification-toggle');
    const knob = pushToggle ? pushToggle.querySelector('.setting-pill-knob') : null;

    if (!('Notification' in window)) {
        alert('❌ 当前浏览器不支持推送通知，请确保使用 iOS 16.4+ 且已将网页添加到主屏幕。');
        return;
    }

    if (Notification.permission === 'granted') {
        alert('✨ 推送已在后台运行！\n如需彻底关闭，请前往手机系统设置 -> Safari/此应用 里关闭通知。');
        if (pushToggle) {
            pushToggle.style.background = 'var(--accent-color)';
            if(knob) knob.style.left = '23px';
        }
    } else if (Notification.permission === 'denied') {
        alert('🛑 推送权限已被系统永久拒绝。\n请前往手机系统设置，找到此网页App，手动允许通知。');
    } else {
        // 核心：由用户的点击直接触发，苹果才会弹框！
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                if (pushToggle) {
                    pushToggle.style.background = 'var(--accent-color)';
                    if(knob) knob.style.left = '23px';
                }
                if (typeof showNotification === 'function') {
                    showNotification('✅ 后台消息推送已成功开启！', 'success');
                } else {
                    alert('✅ 后台消息推送已成功开启！');
                }
            }
        } catch(e) {
            console.warn('请求推送权限出错:', e);
        }
    }
};

// 页面加载时，静默检查当前授权状态，并点亮开关
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const pushToggle = document.getElementById('push-notification-toggle');
            const knob = pushToggle ? pushToggle.querySelector('.setting-pill-knob') : null;
            if (pushToggle) {
                pushToggle.style.background = 'var(--accent-color)';
                if(knob) knob.style.left = '23px';
            }
        }
    }, 1000);
});

// 🔔 真正的系统推送引擎：拦截梦角的新消息并推送到手机通知栏
document.addEventListener('DOMContentLoaded', () => {
    // 设置一个定时器，确保原有的 addMessage 函数已经加载完毕
    setTimeout(() => {
        if (typeof window.addMessage === 'function' && !window._systemPushHooked) {
            const originalAddMessage = window.addMessage;
            
            // 劫持系统的“添加消息”函数
            window.addMessage = function(msg) {
                // 1. 先照常把消息显示在聊天界面里
                originalAddMessage.apply(this, arguments);

                // 2. 判断是否需要触发手机横幅推送：
                // 条件：有消息 + 消息是对方发的 + 手机锁屏或在其他App(后台) + 通知权限已开启
                if (msg && msg.sender !== 'user' && msg.type !== 'system') {
                    if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                        
                        // 提取通知显示的文字
                        let notifBody = msg.text || '';
                        if (msg.image) notifBody = '[图片]';
                        if (msg.type === 'voice') notifBody = '[语音]';
                        
                        const partnerName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
                        const notifTitle = partnerName + ' 发来了一条新消息';

                        // 3. 苹果 iOS PWA 专属的高级推送通道 (Service Worker)
                        if (navigator.serviceWorker) {
                            navigator.serviceWorker.getRegistration().then(function(reg) {
                                if (reg && reg.showNotification) {
                                    // iOS 必须用这个方法才能在后台弹出横幅
                                    reg.showNotification(notifTitle, {
                                        body: notifBody,
                                        icon: './apple-touch-icon.png',
                                        tag: 'chat-message',
                                        renotify: true
                                    });
                                } else {
                                    // 备用通道
                                    new Notification(notifTitle, { body: notifBody, icon: './apple-touch-icon.png' });
                                }
                            }).catch(function() {
                                new Notification(notifTitle, { body: notifBody, icon: './apple-touch-icon.png' });
                            });
                        } else {
                            // PC或安卓的普通通道
                            new Notification(notifTitle, { body: notifBody, icon: './apple-touch-icon.png' });
                        }
                    }
                }
            };
            window._systemPushHooked = true;
            console.log('✅ 全局消息推送拦截器已挂载！');
        }
    }, 2000);
});
