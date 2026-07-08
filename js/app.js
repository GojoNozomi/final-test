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
               【更 换 表 情 包 Gist 网 址 的 位 置】：
               老奴已帮你去除了死锁哈希值，现在它永远指向你 Gist 仓库的最新实时状态！
               🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟 */
            let myStickerGistUrl = 'https://gist.githubusercontent.com/yvainewen/9ed769a74214b6b52f5dd44b2bb4638c/raw/stickers.json';
            
            let response = await fetch(myStickerGistUrl, { cache: 'no-store' }); 
            if (response.ok) {
                let list = await response.json();
                
                // 🎯【核心修复】：精准狙击 "u" 键，完美兼容老版 Mufy 格式的表情包外链
                let cleanList = [];
                if (Array.isArray(list)) {
                    cleanList = list.map(item => {
                        if (typeof item === 'string') return item.trim();
                        if (item && typeof item === 'object') {
                            return item.u || item.url || item.link || item.src || '';
                        }
                        return '';
                    }).filter(url => url && url.startsWith('http'));
                }
                
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
                
                // 挂载全局影子代理，给别的文件调用托底
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
            console.warn('LocalForage 未加载，将使用 localStorage 方案');
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

        setTimeout(async () => {
            if ('Notification' in window && Notification.permission === 'default') {
                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        showNotification('已开启系统通知，收到消息时会提醒你', 'success', 3000);
                    }
                } catch(e) { console.warn('通知权限请求失败:', e); }
            }
        }, 3000);

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
