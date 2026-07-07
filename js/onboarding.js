(function() {
    var TI_AVATAR_KEY = 'tiSettings_showAvatar';
    var TI_TEXT_KEY = 'tiSettings_customText';
    var tiShowAvatar = localStorage.getItem(TI_AVATAR_KEY) !== 'false';
    var tiCustomText = localStorage.getItem(TI_TEXT_KEY) || '';

    function applyTiAvatarVisibility() {
        var avatarEl = document.getElementById('typing-indicator-avatar');
        if (!avatarEl) return;
        avatarEl.style.display = tiShowAvatar ? '' : 'none';
    }

    function getTiLabel() {
        if (tiCustomText) return tiCustomText;
        var name = (window.settings && settings.partnerName) ? settings.partnerName : '对方';
        return name + ' 正在输入';
    }

    function updatePreview() {
        var previewText = document.getElementById('ti-preview-text');
        var previewAvatar = document.getElementById('ti-preview-avatar');
        if (previewText) previewText.textContent = getTiLabel();
        if (previewAvatar) previewAvatar.style.display = tiShowAvatar ? '' : 'none';
        var label = document.getElementById('typing-indicator-label');
        if (label && label.textContent) label.textContent = getTiLabel();
        var actualAvatar = document.getElementById('typing-indicator-avatar');
        if (actualAvatar) actualAvatar.style.display = tiShowAvatar ? '' : 'none';
    }

    function syncPillUI() {
        var row = document.getElementById('ti-avatar-toggle');
        if (!row) return;
        if (tiShowAvatar) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        applyTiAvatarVisibility();
    });

    var labelEl = null;
    function initLabelObserver() {
        labelEl = document.getElementById('typing-indicator-label');
        if (!labelEl || labelEl._tiObserved) return;
        labelEl._tiObserved = true;
        var obs = new MutationObserver(function() {
            if (tiCustomText && labelEl.textContent !== tiCustomText) {
                labelEl.textContent = tiCustomText;
            }
        });
        obs.observe(labelEl, { childList: true, characterData: true, subtree: true });
    }
    setTimeout(initLabelObserver, 1000);

    document.addEventListener('click', function(e) {
        var ti = e.target.closest('.typing-indicator');
        if (!ti) return;
        e.stopPropagation();
        initLabelObserver();
        var modal = document.getElementById('ti-settings-modal');
        if (!modal) return;
        var input = document.getElementById('ti-text-input');
        if (input) input.value = tiCustomText;
        syncPillUI();
        updatePreview();
        var partnerImg = document.querySelector('#partner-info .message-avatar img') ||
                         document.querySelector('.partner-avatar img') ||
                         document.querySelector('[id*="partner"] img');
        var previewAvatar = document.getElementById('ti-preview-avatar');
        if (previewAvatar && partnerImg) {
            previewAvatar.innerHTML = '<img src="' + partnerImg.src + '" style="width:100%;height:100%;object-fit:cover;">';
        }
        modal.classList.add('open');
    });

    document.addEventListener('click', function(e) {
        var modal = document.getElementById('ti-settings-modal');
        if (!modal || !modal.classList.contains('open')) return;
        if (e.target === modal) modal.classList.remove('open');
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.id === 'ti-settings-close-btn') {
            var modal = document.getElementById('ti-settings-modal');
            if (modal) modal.classList.remove('open');
        }
    });

    document.addEventListener('click', function(e) {
        var row = e.target.closest('#ti-avatar-toggle');
        if (!row) return;
        tiShowAvatar = !tiShowAvatar;
        localStorage.setItem(TI_AVATAR_KEY, tiShowAvatar);
        syncPillUI();
        updatePreview();
        applyTiAvatarVisibility();
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'ti-text-save-btn') return;
        var input = document.getElementById('ti-text-input');
        if (!input) return;
        tiCustomText = input.value.trim();
        localStorage.setItem(TI_TEXT_KEY, tiCustomText);
        updatePreview();
        e.target.textContent = '已保存 ✓';
        setTimeout(function() { e.target.textContent = '保存'; }, 1200);
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'ti-text-reset-btn') return;
        tiCustomText = '';
        localStorage.removeItem(TI_TEXT_KEY);
        var input = document.getElementById('ti-text-input');
        if (input) input.value = '';
        updatePreview();
    });

    document.addEventListener('DOMContentLoaded', function() { syncPillUI(); });
    setTimeout(syncPillUI, 800);
})();

// 🚀 【核级绝杀】：暴力注入“已看过教程和保证书”的标记，强行阻止所有烦人的弹窗！
(function bypassAllAnnoyingTutorials() {
    var PLEDGE_KEY = 'splashPledgeSigned_v3';
    localStorage.setItem(PLEDGE_KEY, 'true');
    localStorage.setItem('splashPledgeSigned_v2', 'true');
    localStorage.setItem('splashPledgeSigned_v1', 'true');
    localStorage.setItem('splashPledgeSigned', 'true');
    localStorage.setItem((window.APP_PREFIX || '') + 'tour_seen', 'true');

    // 如果网页里还残留着 HTML 躯壳，直接强行隐藏它们！
    window.addEventListener('DOMContentLoaded', function() {
        var splash = document.getElementById('splash-declaration');
        if (splash) splash.style.display = 'none';
        var tourOverlay = document.getElementById('tour-overlay');
        if (tourOverlay) tourOverlay.style.display = 'none';
    });
})();
