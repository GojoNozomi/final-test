(function () {
    'use strict';
    (function blockDm6CSS() {
        if (document.getElementById('dm6-style')) return; 
        var s = document.createElement('style');
        s.id = 'dm6-style'; 
        s.textContent = '/* dm6-style blocked by data-modal v27 */';
        document.head.appendChild(s);
    })();

    var INNER_HTML =
        '<div class="dm-topbar">'
        +   '<div class="dm-topbar-left">'
        +     '<button class="dm-topbar-back" id="back-data"><i class="fas fa-arrow-left"></i></button>'
        +     '<span class="dm-topbar-title">数据管理 (终极精简版 v27)</span>'
        +   '</div>'
        +   '<button class="dm-topbar-close" id="close-data"><i class="fas fa-xmark"></i></button>'
        + '</div>'

        + '<div class="dm-body">'

        +   '<div class="dm-storage-card">'
        +     '<div class="dm-storage-header">'
        +       '<span class="dm-storage-title"><i class="fas fa-database" style="margin-right:5px;opacity:0.55"></i>存储用量</span>'
        +       '<span class="dm-storage-label" id="dm-storage-total">计算中…</span>'
        +     '</div>'
        +     '<div class="dm-stats-grid">'
        +       '<div class="dm-stat-block"><div class="dm-stat-block-icon" style="color:var(--accent-color)"><i class="fas fa-comments"></i></div><div class="dm-stat-pill-val" id="dm-stat-msgs">—</div><div class="dm-stat-pill-key">聊天记录</div></div>'
        +       '<div class="dm-stat-block"><div class="dm-stat-block-icon" style="color:#9C6FD4"><i class="fas fa-sliders"></i></div><div class="dm-stat-pill-val" id="dm-stat-settings">—</div><div class="dm-stat-pill-key">设置数据</div></div>'
        +       '<div class="dm-stat-block"><div class="dm-stat-block-icon" style="color:#3BC8A4"><i class="fas fa-images"></i></div><div class="dm-stat-pill-val" id="dm-stat-media">—</div><div class="dm-stat-pill-key">图片媒体</div></div>'
        +     '</div>'
        +   '</div>'

        /* ☁️ ========== GitHub 云端记忆库控制中心 ========== ☁️ */
        +   '<div class="dm-section-label" style="color:var(--text-primary);"><i class="fab fa-github"></i> GitHub 云端记忆库</div>'
        +   '<div class="dm-row-card" style="padding:15px; display:flex; flex-direction:column; gap:10px;">'
        
        +     '<div style="font-size:11px;color:var(--text-secondary);line-height:1.6;background:rgba(0,0,0,0.03);padding:10px;border-radius:8px;">'
        +       '<b>【Private 模式 (日常推荐)】</b>：仅支持将纯文本记录“自动/手动”备份至云端。若需恢复，请去 GitHub 下载对应的 JSON，在下方点击“聊天记录”手动导入。<br>'
        +       '<div style="margin-top:4px;"><b>【Public 模式 (快捷恢复)】</b>：前往 GitHub 将此仓库 Settings 底部的 Visibility 改为 Public，点击下方“一键恢复”即可还原。<b>⚠ 注意：恢复成功后请立刻改回 Private 防偷窥！</b></div>'
        +     '</div>'
        
        +     '<input type="password" id="gh-token" placeholder="输入 GitHub Token (必须具备 repo 权限)" style="padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-primary);font-size:12px;outline:none;" oninput="window.GitHubSync.saveConfig()">'
        +     '<input type="text" id="gh-repo" placeholder="仓库路径 (如 GojoNozomi/Satoru-Nozomi-Memory)" style="padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-primary);font-size:12px;outline:none;" oninput="window.GitHubSync.saveConfig()">'
        +     '<input type="text" id="gh-path" placeholder="存储文件名 (如 slim_history.json)" value="chat_history.json" style="padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-primary);font-size:12px;outline:none;" oninput="window.GitHubSync.saveConfig()">'
        +     '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px dashed var(--border-color);padding-top:10px;margin-top:2px;">'
        +       '<div style="font-size:12px;font-weight:600;"><i class="fas fa-sync" style="color:var(--accent-color);margin-right:6px;"></i>自动备份聊天记录</div>'
        +       '<label class="dm-toggle-pill"><input type="checkbox" id="gh-autosync-toggle" onchange="window.GitHubSync.saveConfig()"><span class="dm-toggle-slider"></span></label>'
        +     '</div>'
        +     '<div style="display:flex;gap:10px;margin-top:6px;">'
        +       '<button class="modal-btn modal-btn-secondary" onclick="window.GitHubSync.pullUI()" style="flex:1;font-size:12px;padding:8px;"><i class="fas fa-cloud-download-alt"></i> 一键恢复</button>'
        +       '<button class="modal-btn modal-btn-primary" onclick="window.GitHubSync.pushUI()" style="flex:1;font-size:12px;padding:8px;background:var(--accent-color);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.25);border:none;"><i class="fas fa-cloud-upload-alt"></i> 上传云端</button>'
        +     '</div>'
        +     '<div id="gh-sync-status" style="font-size:11px;color:var(--text-secondary);text-align:center;margin-top:4px;">状态：待命</div>'
        +   '</div>'
        /* ☁️ ================================================ ☁️ */

        +   '<div class="dm-section-label"><i class="fas fa-cloud-upload-alt"></i> 本地旧版备份</div>'
        +   '<div class="dm-grid">'
        +     '<div class="dm-tile" id="dm-tile-full-backup">'
        +       '<div class="dm-tile-icon blue"><i class="fas fa-layer-group"></i></div>'
        +       '<div class="dm-tile-info"><div class="dm-tile-title">全量备份</div><div class="dm-tile-desc">包含所有设置 (原生)</div></div>'
        +       '<i class="fas fa-chevron-right dm-tile-arrow"></i>'
        +     '</div>'
        +     '<div class="dm-tile" id="dm-tile-chat-backup">'
        +       '<div class="dm-tile-icon teal"><i class="fas fa-comments"></i></div>'
        +       '<div class="dm-tile-info"><div class="dm-tile-title">聊天记录</div><div class="dm-tile-desc">导入纯享 JSON 自动重构</div></div>'
        +       '<i class="fas fa-chevron-right dm-tile-arrow"></i>'
        +     '</div>'
        +   '</div>'

        +   '<div style="display:none">'
        +     '<button id="export-all-settings"></button>'
        +     '<button id="import-all-settings"></button>'
        +     '<button id="export-chat-btn"></button>'
        +     '<button id="import-chat-btn"></button>'
        +   '</div>'

        +   '<div class="dm-section-label danger-label"><i class="fas fa-triangle-exclamation"></i> 危险操作</div>'
        +   '<div class="dm-danger-cards dm-danger-cards-row">'
        +     '<button class="dm-danger-card dm-danger-card-orange dm-danger-card-half" id="clear-chat-only">'
        +       '<div class="dm-danger-card-icon"><i class="fas fa-eraser"></i></div>'
        +       '<div class="dm-danger-card-body">'
        +         '<div class="dm-danger-card-title">清除会话</div>'
        +         '<div class="dm-danger-card-desc">删除本会话消息</div>'
        +       '</div>'
        +     '</button>'
        +     '<button class="dm-danger-card dm-danger-card-red dm-danger-card-half" id="clear-storage">'
        +       '<div class="dm-danger-card-icon"><i class="fas fa-skull-crossbones"></i></div>'
        +       '<div class="dm-danger-card-body">'
        +         '<div class="dm-danger-card-title">重置数据</div>'
        +         '<div class="dm-danger-card-desc">清空所有，不可撤销</div>'
        +       '</div>'
        +     '</button>'
        +   '</div>'
        + '</div>';

    var DRAWER_FULL_HTML =
        '<div class="dm-action-drawer" id="dm-drawer-full">'
        +   '<div class="dm-drawer-backdrop" id="dm-drawer-full-backdrop"></div>'
        +   '<div class="dm-drawer-sheet">'
        +     '<div class="dm-drawer-handle"></div>'
        +     '<div class="dm-drawer-title">'
        +       '<div class="dm-drawer-title-icon blue" style="background:linear-gradient(135deg,#4A90E2,#3576C8);color:#fff"><i class="fas fa-layer-group"></i></div>'
        +       '<div><div class="dm-drawer-title-text">全量备份</div><div class="dm-drawer-subtitle">包含所有设置、外观、字卡等数据</div></div>'
        +     '</div>'
        +     '<div class="dm-drawer-actions">'
        +       '<button class="dm-drawer-action-btn primary" id="export-all-settings-real">'
        +         '<div class="dm-drawer-btn-icon"><i class="fas fa-download"></i></div>'
        +         '<div class="dm-drawer-btn-text"><div class="dm-drawer-btn-title">导出备份</div><div class="dm-drawer-btn-desc">将数据保存为文件</div></div>'
        +       '</button>'
        +       '<button class="dm-drawer-action-btn" id="import-all-settings-real">'
        +         '<div class="dm-drawer-btn-icon"><i class="fas fa-upload"></i></div>'
        +         '<div class="dm-drawer-btn-text"><div class="dm-drawer-btn-title">从文件恢复</div><div class="dm-drawer-btn-desc">选择之前导出的备份文件</div></div>'
        +       '</button>'
        +     '</div>'
        +     '<button class="dm-drawer-cancel" id="dm-drawer-full-cancel">取消</button>'
        +   '</div>'
        + '</div>';

    var DRAWER_CHAT_HTML =
        '<div class="dm-action-drawer" id="dm-drawer-chat">'
        +   '<div class="dm-drawer-backdrop" id="dm-drawer-chat-backdrop"></div>'
        +   '<div class="dm-drawer-sheet">'
        +     '<div class="dm-drawer-handle"></div>'
        +     '<div class="dm-drawer-title">'
        +       '<div class="dm-drawer-title-icon" style="background:linear-gradient(135deg,#3BC8A4,#20A882);color:#fff"><i class="fas fa-comments"></i></div>'
        +       '<div><div class="dm-drawer-title-text">聊天记录</div><div class="dm-drawer-subtitle">仅包含消息内容</div></div>'
        +     '</div>'
        +     '<div class="dm-drawer-actions">'
        +       '<button class="dm-drawer-action-btn primary" id="export-chat-btn-real" style="background:linear-gradient(135deg,#3BC8A4,#20A882);border-color:#3BC8A4">'
        +         '<div class="dm-drawer-btn-icon"><i class="fas fa-download"></i></div>'
        +         '<div class="dm-drawer-btn-text"><div class="dm-drawer-btn-title">导出聊天</div><div class="dm-drawer-btn-desc">将消息记录保存为文件</div></div>'
        +       '</button>'
        +       '<button class="dm-drawer-action-btn" id="import-chat-btn-real">'
        +         '<div class="dm-drawer-btn-icon"><i class="fas fa-upload"></i></div>'
        +         '<div class="dm-drawer-btn-text"><div class="dm-drawer-btn-title">导入聊天</div><div class="dm-drawer-btn-desc">从文件恢复历史消息</div></div>'
        +       '</button>'
        +     '</div>'
        +     '<button class="dm-drawer-cancel" id="dm-drawer-chat-cancel">取消</button>'
        +   '</div>'
        + '</div>';

    /* 🧠 ========== GitHub 自动化云端大脑 ========== 🧠 */
    window.GitHubSync = {
        getPfx: function() { return (typeof window.APP_PREFIX !== 'undefined' ? window.APP_PREFIX : 'CHAT_APP_V3_'); },
        getConfig: function() {
            let pfx = this.getPfx();
            return {
                token: localStorage.getItem(pfx + 'gh_token') || '',
                repo: localStorage.getItem(pfx + 'gh_repo') || '',
                path: localStorage.getItem(pfx + 'gh_path') || 'chat_history.json',
                auto: localStorage.getItem(pfx + 'gh_auto') === '1'
            };
        },
        saveConfig: function() {
            let pfx = this.getPfx();
            if(document.getElementById('gh-token')) localStorage.setItem(pfx + 'gh_token', document.getElementById('gh-token').value.trim());
            if(document.getElementById('gh-repo')) localStorage.setItem(pfx + 'gh_repo', document.getElementById('gh-repo').value.trim());
            if(document.getElementById('gh-path')) localStorage.setItem(pfx + 'gh_path', document.getElementById('gh-path').value.trim());
            if(document.getElementById('gh-autosync-toggle')) localStorage.setItem(pfx + 'gh_auto', document.getElementById('gh-autosync-toggle').checked ? '1' : '0');
        },
        loadUI: function() {
            let cfg = this.getConfig();
            if(document.getElementById('gh-token')) document.getElementById('gh-token').value = cfg.token;
            if(document.getElementById('gh-repo')) document.getElementById('gh-repo').value = cfg.repo;
            if(document.getElementById('gh-path')) document.getElementById('gh-path').value = cfg.path;
            if(document.getElementById('gh-autosync-toggle')) document.getElementById('gh-autosync-toggle').checked = cfg.auto;
        },
        setStatus: function(msg, isError) {
            let el = document.getElementById('gh-sync-status');
            if(el) {
                el.textContent = '状态：' + msg;
                el.style.color = isError ? '#ff4757' : 'var(--accent-color)';
            }
        },
        cleanToken: function(str) { return (str || '').replace(/[^a-zA-Z0-9_]/g, ''); },
        cleanRepo: function(str) { return (str || '').replace(/[^a-zA-Z0-9_.\/-]/g, ''); },
        cleanPath: function(str) { return (str || '').replace(/[^a-zA-Z0-9_.-]/g, ''); },
        
        pushUI: async function() {
            this.setStatus('正在打包并推送纯享版...', false);
            let res = await this.push();
            this.setStatus(res.msg, !res.success);
            if(res.success && typeof showNotification === 'function') showNotification('云端极简版备份成功！', 'success');
        },

        pullUI: async function() {
            const cfg = this.getConfig();
            let cRepo = this.cleanRepo(cfg.repo);
            let cPath = this.cleanPath(cfg.path);

            if(!cRepo) return this.setStatus('请先填写仓库路径', true);
            this.setStatus('正在走公开免密通道拉取并智能重构...', false);
            try {
                let rawUrl = 'https://raw.githubusercontent.com/' + cRepo + '/main/' + cPath;
                let res = await fetch(rawUrl, { cache: 'no-store' }); 
                if (!res.ok && res.status === 404) {
                    rawUrl = 'https://raw.githubusercontent.com/' + cRepo + '/master/' + cPath;
                    res = await fetch(rawUrl, { cache: 'no-store' });
                }
                if (!res.ok) throw new Error('拉取失败，请确保改成了 Public: ' + res.status);
                
                let msgs = await res.json();
                if (!Array.isArray(msgs)) throw new Error('云端内容不正确');
                
                let restoredMsgs = msgs.map(function(m) {
                    let ts = m.timestamp;
                    if (!ts && m.id && !isNaN(m.id)) {
                        ts = new Date(Number(m.id)).toISOString(); 
                    }
                    let out = {
                        id: m.id,
                        sender: m.sender,
                        text: m.text !== undefined ? m.text : (m.content || ''),
                        timestamp: ts, 
                        status: m.status || (m.sender === 'user' ? 'read' : 'received'),
                        favorited: m.favorited || false,
                        note: m.note || null
                    };
                    if (m.replyTo) out.replyTo = m.replyTo;
                    return out;
                });

                restoredMsgs.sort(function(a, b) { return Number(a.id) - Number(b.id); });

                let storageKey = typeof getStorageKey === 'function' ? getStorageKey('chatMessages') : (this.getPfx() + 'chatMessages');
                await localforage.setItem(storageKey, restoredMsgs);
                if(typeof window.messages !== 'undefined') window.messages = restoredMsgs; 
                if(typeof renderMessages === 'function') renderMessages();
                if(typeof updateStorageUsageBar === 'function') updateStorageUsageBar();
                
                this.setStatus('云端纯享版拉取并系统重构成功！', false);
                if(typeof showNotification === 'function') showNotification('记录已完美归位！', 'success');
            } catch(e) {
                this.setStatus('拉取报错: ' + e.message, true);
            }
        },

        push: async function() {
            const cfg = this.getConfig();
            let cToken = this.cleanToken(cfg.token);
            let cRepo = this.cleanRepo(cfg.repo);
            let cPath = this.cleanPath(cfg.path);

            if(!cToken || !cRepo) return {success:false, msg:'缺失密钥或配置'};
            try {
                let storageKey = typeof getStorageKey === 'function' ? getStorageKey('chatMessages') : (this.getPfx() + 'chatMessages');
                let messages = await localforage.getItem(storageKey) || window.messages || [];
                if (!messages || messages.length === 0) return {success:false, msg:'本地没有聊天数据'};

                let slimMessages = [];
                for (let i = 0; i < messages.length; i++) {
                    let m = messages[i];
                    if (!m) continue;
                    let slimM = { id: m.id };
                    if (m.sender) slimM.sender = m.sender;

                    let rawText = m.text !== undefined ? m.text : (m.content !== undefined ? m.content : '');
                    if (typeof rawText === 'string' && rawText.length > 800 && rawText.indexOf('data:image') === 0) {
                        slimM.text = '[图片体积过大，已由云端过滤保命 ☁️]';
                    } else {
                        slimM.text = rawText;
                    }

                    if (m.id && !isNaN(m.id)) {
                        var d = new Date(Number(m.id));
                        var pad = function(n) { return n < 10 ? '0' + n : n; };
                        slimM.time = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
                    }

                    if (m.replyTo !== undefined && m.replyTo !== null && m.replyTo !== '') {
                        slimM.replyTo = m.replyTo;
                    }
                    slimMessages.push(slimM);
                }

                let contentStr = JSON.stringify(slimMessages, null, 2);
                let b64Content = btoa(unescape(encodeURIComponent(contentStr)));

                let sha = '';
                let getRes = await fetch('https://api.github.com/repos/' + cRepo + '/contents/' + cPath, {
                    headers: { 'Authorization': 'token ' + cToken }
                });
                if (getRes.ok) {
                    let getJson = await getRes.json();
                    sha = getJson.sha;
                }

                let putRes = await fetch('https://api.github.com/repos/' + cRepo + '/contents/' + cPath, {
                    method: 'PUT',
                    headers: { 'Authorization': 'token ' + cToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: 'Auto-sync extremely clean chat history ☁️', content: b64Content, sha: sha })
                });

                if(putRes.ok) return {success:true, msg: '纯享极简版同步大成功！ ✓'};
                else return {success:false, msg:'云端接口拒绝: ' + putRes.status};
            } catch(err) {
                return {success:false, msg:err.message};
            }
        }
    };

    if (!window._ghSyncInterceptorInstalled) {
        window._ghSyncInterceptorInstalled = true;
        const origSetItem = localforage.setItem;
        localforage.setItem = async function(key, value) {
            const res = await origSetItem.apply(this, arguments);
            let targetKey = typeof getStorageKey === 'function' ? getStorageKey('chatMessages') : (window.GitHubSync.getPfx() + 'chatMessages');
            if (key === targetKey) {
                if (window.GitHubSync && window.GitHubSync.getConfig().auto) {
                    clearTimeout(window._ghSyncTimer);
                    window._ghSyncTimer = setTimeout(() => {
                        window.GitHubSync.push().then(r => {
                            let el = document.getElementById('gh-sync-status');
                            if(el && r.success) el.textContent = '状态：云端纯享版静默自动同步成功 ✓';
                        });
                    }, 5000);
                }
            }
            return res;
        };
    }
    /* 🧠 ========================================== 🧠 */

    window._updateStatsSafely = async function() {
        var total = 0, msgs = 0, cfg = 0, media = 0;
        var fmt = function(b) { return b<1024 ? b+' B' : b<1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(2)+' MB'; };
        var g = function(id) { return document.getElementById(id); };
        let currentPfx = window.GitHubSync.getPfx();
        
        var getApproxSize = function(obj) {
            if (obj == null) return 0;
            if (typeof obj === 'string') return obj.length * 2;
            if (typeof obj === 'number') return 8;
            if (typeof obj === 'boolean') return 4;
            if (Array.isArray(obj)) {
                var s = 0;
                for (var i = 0; i < obj.length; i++) s += getApproxSize(obj[i]);
                return s;
            }
            if (typeof obj === 'object') {
                var s = 0;
                for (var key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        s += key.length * 2 + getApproxSize(obj[key]);
                    }
                }
                return s;
            }
            return 0;
        };

        try {
            if (window.localforage) {
                var keys = await localforage.keys();
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    if (k.indexOf(currentPfx) !== 0) continue; 
                    var v = await localforage.getItem(k);
                    if (v == null) continue;
                    var bytes = k.length * 2 + getApproxSize(v);
                    total += bytes;
                    if (k.indexOf('chatMessages') !== -1) msgs += bytes;
                    else if (/avatar|image|photo|bg|background|wallpaper/i.test(k)) media += bytes;
                    else cfg += bytes;
                }
                var totEl = g('dm-storage-total');
                if (totEl) totEl.textContent = fmt(total) + ' / ~5 MB';
                if (g('dm-stat-msgs')) g('dm-stat-msgs').textContent = fmt(msgs);
                if (g('dm-stat-settings')) g('dm-stat-settings').textContent = fmt(cfg);
                if (g('dm-stat-media')) g('dm-stat-media').textContent = fmt(media);
            }
        } catch (e) { console.warn(e); }
    };

    function isCorrect(mc) {
        var titleEl = mc.querySelector('.dm-topbar-title');
        return mc.querySelector('.dm-topbar') !== null
            && mc.querySelector('.dm-stats-grid') !== null
            && titleEl !== null
            && titleEl.textContent.indexOf('v27') !== -1
            && document.getElementById('dm-drawer-full') !== null
            && document.getElementById('dm-drawer-chat') !== null;
    }

    function ensureDrawersOnBody() {
        var DRAWER_IDS = ['dm-drawer-full', 'dm-drawer-chat'];
        DRAWER_IDS.forEach(function(id) {
            var existing = document.getElementById(id);
            if (existing && existing.parentElement === document.body) return;
            if (existing) {
                document.body.appendChild(existing);
                return;
            }
            var dummy = document.createElement('div');
            if (id === 'dm-drawer-full') dummy.innerHTML = DRAWER_FULL_HTML;
            else dummy.innerHTML = DRAWER_CHAT_HTML;
            document.body.appendChild(dummy.firstElementChild);
        });
    }

    function writeHTML(mc) {
        mc.innerHTML = INNER_HTML;
        mc.dataset.dm6Built = 'v27'; 
        ensureDrawersOnBody();
        bindAll(mc);
    }

    function ensureHTML(mc) {
        if (!mc) return;
        mc.dataset.dm6Built = 'v27'; 
        if (!isCorrect(mc)) writeHTML(mc);
        else ensureDrawersOnBody(); 
    }

    function syncToggles() {
        var n = document.getElementById('notif-permission-toggle');
        if (n) n.checked = localStorage.getItem('notifEnabled') === '1'
                        && 'Notification' in window
                        && Notification.permission === 'granted';
    }

    function openDrawer(drawerId) {
        var drawer = document.getElementById(drawerId);
        if (!drawer) return;
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeDrawer(drawerId) {
        var drawer = document.getElementById(drawerId);
        if (!drawer) return;
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    function bindAll(mc) {
        var closeBtn = mc.querySelector('#close-data');
        if (closeBtn) closeBtn.addEventListener('click', function () {
            var modal = document.getElementById('data-modal');
            if (modal && typeof hideModal === 'function') hideModal(modal);
        });

        var backBtn = mc.querySelector('#back-data');
        if (backBtn) backBtn.addEventListener('click', function () {
            var dataModal = document.getElementById('data-modal');
            if (dataModal && typeof hideModal === 'function') hideModal(dataModal);
            var settingsModal = document.getElementById('settings-modal');
            if (settingsModal && typeof showModal === 'function') showModal(settingsModal);
        });

        var tileFullBackup = mc.querySelector('#dm-tile-full-backup');
        if (tileFullBackup) tileFullBackup.addEventListener('click', function () { openDrawer('dm-drawer-full'); });

        var tileChatBackup = mc.querySelector('#dm-tile-chat-backup');
        if (tileChatBackup) tileChatBackup.addEventListener('click', function () { openDrawer('dm-drawer-chat'); });

        var fullDrawer = document.getElementById('dm-drawer-full');
        if (fullDrawer) {
            var backdrop1 = fullDrawer.querySelector('#dm-drawer-full-backdrop');
            if (backdrop1) backdrop1.addEventListener('click', function () { closeDrawer('dm-drawer-full'); });
            var cancelBtn1 = fullDrawer.querySelector('#dm-drawer-full-cancel');
            if (cancelBtn1) cancelBtn1.addEventListener('click', function () { closeDrawer('dm-drawer-full'); });
            
            var exportAllReal = fullDrawer.querySelector('#export-all-settings-real');
            if (exportAllReal) exportAllReal.addEventListener('click', function () {
                closeDrawer('dm-drawer-full');
                if (typeof exportAllData === 'function') exportAllData();
            });
            
            var importAllReal = fullDrawer.querySelector('#import-all-settings-real');
            if (importAllReal) importAllReal.addEventListener('click', function () {
                closeDrawer('dm-drawer-full');
                var inp = document.createElement('input');
                inp.type = 'file'; inp.accept = '.json,.zip,application/json,application/zip';
                inp.onchange = function (e) {
                    var f = e.target.files && e.target.files[0];
                    if (f && typeof importAllData === 'function') importAllData(f);
                };
                inp.click();
            });
        }

        var chatDrawer = document.getElementById('dm-drawer-chat');
        if (chatDrawer) {
            var backdrop2 = chatDrawer.querySelector('#dm-drawer-chat-backdrop');
            if (backdrop2) backdrop2.addEventListener('click', function () { closeDrawer('dm-drawer-chat'); });
            var cancelBtn2 = chatDrawer.querySelector('#dm-drawer-chat-cancel');
            if (cancelBtn2) cancelBtn2.addEventListener('click', function () { closeDrawer('dm-drawer-chat'); });
            
            var exportChatReal = chatDrawer.querySelector('#export-chat-btn-real');
            if (exportChatReal) exportChatReal.addEventListener('click', function () {
                closeDrawer('dm-drawer-chat');
                if (typeof exportChatHistory === 'function') exportChatHistory();
            });
            
            var importChatReal = chatDrawer.querySelector('#import-chat-btn-real');
            if (importChatReal) importChatReal.addEventListener('click', function () {
                closeDrawer('dm-drawer-chat');
                var inp = document.createElement('input');
                inp.type = 'file'; inp.accept = '.json';
                inp.onchange = function (e) {
                    var f = e.target.files && e.target.files[0];
                    if (!f) return;
                    
                    var reader = new FileReader();
                    reader.onload = async function(ev) {
                        try {
                            var msgs = JSON.parse(ev.target.result);
                            if (!Array.isArray(msgs)) throw new Error('这不是有效的聊天记录文件');
                            
                            var restoredMsgs = msgs.map(function(m) {
                                let ts = m.timestamp;
                                if (!ts && m.id && !isNaN(m.id)) {
                                    ts = new Date(Number(m.id)).toISOString();
                                }
                                let out = {
                                    id: m.id,
                                    sender: m.sender,
                                    text: m.text !== undefined ? m.text : (m.content || ''),
                                    timestamp: ts, 
                                    status: m.status || (m.sender === 'user' ? 'read' : 'received'),
                                    favorited: m.favorited || false,
                                    note: m.note || null
                                };
                                if (m.replyTo) out.replyTo = m.replyTo;
                                return out;
                            });
                            
                            restoredMsgs.sort(function(a, b) { return Number(a.id) - Number(b.id); });
                            
                            let pfx = typeof window.APP_PREFIX !== 'undefined' ? window.APP_PREFIX : 'CHAT_APP_V3_';
                            let storageKey = typeof getStorageKey === 'function' ? getStorageKey('chatMessages') : (pfx + 'chatMessages');
                            
                            await localforage.setItem(storageKey, restoredMsgs);
                            if(typeof window.messages !== 'undefined') window.messages = restoredMsgs; 
                            if(typeof renderMessages === 'function') renderMessages();
                            if(typeof updateStorageUsageBar === 'function') updateStorageUsageBar();
                            
                            if(typeof showNotification === 'function') showNotification('导入成功！数据已智能恢复！', 'success');
                            
                            // 🚀【核心修复】：强行关闭数据面板，让绿色弹窗无遮挡显示！
                            var dataModal = document.getElementById('data-modal');
                            if (dataModal && typeof hideModal === 'function') {
                                hideModal(dataModal);
                            } else if (dataModal) {
                                dataModal.style.display = 'none';
                                dataModal.classList.remove('open');
                            }
                        } catch(err) {
                            alert('导入失败: ' + err.message);
                        }
                    };
                    reader.readAsText(f);
                };
                inp.click();
            });
        }

        var clearChatBtn = mc.querySelector('#clear-chat-only');
        if (clearChatBtn) clearChatBtn.addEventListener('click', function () {
            if (!confirm('确定要清除当前会话的所有消息吗？\n\n所有设置、头像、字卡等数据将保留，仅聊天记录会被删除。\n\n此操作无法恢复！')) return;
            messages = [];
            displayedMessageCount = typeof HISTORY_BATCH_SIZE !== 'undefined' ? HISTORY_BATCH_SIZE : 20;
            try { localStorage.removeItem('BACKUP_V1_critical'); } catch(e) {}
            try { localStorage.removeItem('BACKUP_V1_timestamp'); } catch(e) {}
            if (window.localforage && typeof getStorageKey === 'function') {
                localforage.setItem(getStorageKey('chatMessages'), []).catch(function() {});
            }
            if (typeof renderMessages === 'function') renderMessages();
            if (typeof showNotification === 'function') showNotification('聊天记录已清除', 'success');
        });

        var clearBtn = mc.querySelector('#clear-storage');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            if (!confirm('⚠️ 确定要清空全部数据吗？\n\n所有消息、设置、字卡、头像等将被永久删除，不可恢复！')) return;
            if (!confirm('最后确认：清空后页面将自动刷新，无法撤销，继续吗？')) return;
            window._skipBackup = true;
            var doReset = function () {
                localStorage.clear();
                if (typeof showNotification === 'function') showNotification('所有数据已清空，即将刷新…', 'info', 2000);
                setTimeout(function () { window.location.href = window.location.pathname + '?reset=' + Date.now(); }, 2000);
            };
            window.localforage ? localforage.clear().then(doReset).catch(doReset) : doReset();
        });
    }

    function onModalOpen(modal) {
        var mc = modal.querySelector('.modal-content');
        if (!mc) return;
        ensureHTML(mc);
        requestAnimationFrame(function () {
            mc.style.opacity = '1';
            mc.style.transform = 'none';
        });
        setTimeout(function () {
            if(window._updateStatsSafely) window._updateStatsSafely();
            syncToggles();
            if(window.GitHubSync) window.GitHubSync.loadUI();
        }, 60);
    }

    var _styleObserver = null;
    var _contentObserver = null;

    function init() {
        var modal = document.getElementById('data-modal');
        if (!modal) return;

        var mc = modal.querySelector('.modal-content');
        if (mc) mc.dataset.dm6Built = 'v27';

        if (_styleObserver) { _styleObserver.disconnect(); _styleObserver = null; }
        if (_contentObserver) { _contentObserver.disconnect(); _contentObserver = null; }

        _styleObserver = new MutationObserver(function () {
            var d = modal.style.display;
            if (d === 'flex' || d === 'block') onModalOpen(modal);
        });
        _styleObserver.observe(modal, { attributes: true, attributeFilter: ['style'] });

        if (mc) {
            _contentObserver = new MutationObserver(function () {
                var mc2 = modal.querySelector('.modal-content');
                if (mc2 && !isCorrect(mc2)) {
                    mc2.dataset.dm6Built = 'v27';
                    writeHTML(mc2);
                }
            });
            _contentObserver.observe(mc, { childList: true, subtree: false });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
    } else {
        init();
    }

})();

function updateStorageUsageBar() {
    if(window._updateStatsSafely) window._updateStatsSafely();
}

(function() {
    var orig = window.showModal;
    if (typeof orig === 'function') {
        window.showModal = function(el) {
            orig.apply(this, arguments);
            if (el && el.id === 'data-modal') {
                setTimeout(updateStorageUsageBar, 250);
            }
        };
    }
})();
