(function() {
    'use strict';
    
    // Constants to avoid magic numbers
    const CONSTANTS = {
        VERSION: '1.0.0',
        BUILD_DATE: '2024-11-02',
        MAX_DISKS: 12,
        MIN_DISKS: 1,
        MAX_CHALLENGE_DISKS: 8,
        TIMER_UPDATE_INTERVAL: 250,
        ACHIEVEMENT_DISPLAY_DURATION: 3200,
        DISK_BASE_WIDTH: 40,
        DISK_WIDTH_INCREMENT: 18,
        DISK_BASE_ZINDEX: 100,
        MAX_FS_CACHE_SIZE: 200,
        MAX_AUDIO_SIZE_MB: 2,
        MAX_BG_SIZE_MB: 2,
        STORAGE_LIMIT_MB: 5
    };

    const V = CONSTANTS.VERSION, BD = CONSTANTS.BUILD_DATE;
    const BI = {version:V,buildDate:BD,features:['Play','Teach','Learn','Challenge','Sandbox'],totalAchievements:27,author:'TTT'};
    console.log(`%c🎮 TAM THÁI TỬ v${V}`,'font-size:14px;font-weight:bold;color:#2b8cff');console.log('Build:',BD);

    const ErrLog={errs:[],log:function(err,ctx=''){const e={time:new Date().toISOString(),msg:err.message||err,stack:err.stack||'',ctx:ctx};this.errs.push(e);console.error(`[${ctx}]`,err);try{const s=JSON.parse(localStorage.getItem('hanoi_errors')||'[]');s.push(e);if(s.length>50)s.shift();localStorage.setItem('hanoi_errors',JSON.stringify(s));}catch(ex){}}};

    function sanitize(str){const d=document.createElement('div');d.textContent=str;return d.innerHTML;}

    const nE = document.getElementById('n'), mvE = document.getElementById('mv'), bE = document.getElementById('best'), tE = document.getElementById('tm'), bestNE = document.getElementById('best-n');
    const thE = document.getElementById('theme'), sndE = document.getElementById('snd'), spdE = document.getElementById('spd');
    const stage = document.getElementById('stage'), prgE = document.getElementById('prog'), htE = document.getElementById('hintText');
    const finishPopup = document.getElementById('finish');
    const autoBtn = document.getElementById('auto'), hintBtn = document.getElementById('hint'), undoBtn = document.getElementById('undo'), speedLabel = document.getElementById('speedLabel');

    const errorPopup = document.getElementById('errorPopup');
    const errorPopupText = document.getElementById('errorPopupText');
    const hintPopup = document.getElementById('hintPopup');
    const challengeDifficultyPopup = document.getElementById('challengeDifficultyPopup');
    const achievementsPopup = document.getElementById('achievementsPopup');
    const achievementUnlockedPopup = document.getElementById('achievementUnlockedPopup');
    const sandboxSetupPopup = document.getElementById('sandboxSetupPopup');
    const settingsPopup = document.getElementById('settingsPopup');
    const loserPopup = document.getElementById('loserPopup');

    const titleDisplayContainer = document.getElementById('titleDisplayContainer');
    const titleDisplay = document.getElementById('titleDisplay');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsResetBtn = document.getElementById('settingsReset');
    const settingsHeader = document.getElementById('settingsHeader');
    const settingsMinimizeBtn = document.getElementById('settingsMinimize');
    const settingsCloseX = document.getElementById('settingsCloseX');

    const bgmEl = document.getElementById('bgm');
    const pickupSnd = document.getElementById('snd_pickup');
    const dropSnd = document.getElementById('snd_drop');
    const errorSnd = document.getElementById('snd_error');
    const winSnd = document.getElementById('snd_win');
    const fireworksSnd = document.getElementById('snd_fireworks');
    const audEls = {
        bgm: { el: bgmEl, input: document.getElementById('bgmUpload'), status: document.getElementById('bgmUploadStatus'), key: 'customBGM' },
        pickup: { el: pickupSnd, input: document.getElementById('pickupUpload'), status: document.getElementById('pickupUploadStatus'), key: 'customPickup' },
        drop: { el: dropSnd, input: document.getElementById('dropUpload'), status: document.getElementById('dropUploadStatus'), key: 'customDrop' },
        win: { el: winSnd, input: document.getElementById('winUpload'), status: document.getElementById('winUploadStatus'), key: 'customWin' }
    };

    function hasConfetti(){try{return typeof window!=='undefined'&&typeof window.confetti==='function';}catch(_){return false;}}
    function safeConfetti(o){if(!hasConfetti())return;window.confetti(o);}

    const sandboxDisksSlider = document.getElementById('sandboxDisks');
    const sandboxDisksValue = document.getElementById('sandboxDisksValue');
    const sandboxPolesSlider = document.getElementById('sandboxPoles');
    const sandboxPolesValue = document.getElementById('sandboxPolesValue');
    const sandboxRuleSelect = document.getElementById('sandboxRule');
    const sandboxRuleDesc = document.getElementById('sandboxRuleDesc');
    const sandboxStartPosSelect = document.getElementById('sandboxStartPos');
    const sandboxTargetSelect = document.getElementById('sandboxTarget');
    const sandboxStartBtn = document.getElementById('sandboxStart');
    const sbInline = document.getElementById('sbInline');
    const sbStartInline = document.getElementById('sbStartInline');
    const sbTargetInline = document.getElementById('sbTargetInline');
    const sbRuleInline = document.getElementById('sbRuleInline');
    const sbFsInfo = document.getElementById('sbFsInfo');

    let n = 4, moves = 0, tmr = null, t0 = null, run = false, seq = [], ix = 0, teach = null, diskCols = ["#e74c3c", "#f39c12", "#2ecc71", "#3498db", "#9b59b6", "#1abc9c", "#e67e22", "#8e44ad"];
    let MODE = 'play';
    let chTimer = null, chDead = 0, chLimit = 0, chActive = false;
    let mvHist = [];
    let heldDisk = null;
    let undoCount = 0;
    
    // Mobile touch support for disk dragging
    let touchState = {
        active: false,
        diskId: null,
        fromPole: null,
        initialY: 0,
        currentY: 0
    };
    let usedAuto = false;
    
    // Device detection để chọn interaction model phù hợp
    const DEVICE_TYPE = (function detectDevice() {
        // Kiểm tra user agent cho mobile devices
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Kiểm tra screen size
        const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;
        
        // Kiểm tra touch capability (chú ý: nhiều PC có maxTouchPoints > 0 nhầm)
        const hasRealTouch = 'ontouchstart' in window;
        const hasTouchPoints = (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
        
        // Kiểm tra pointer events
        const hasPointerEvents = window.PointerEvent !== undefined;
        
        // Decision logic (SIMPLIFIED - ưu tiên Desktop):
        // 1. Mobile UA + small screen → MOBILE (chắc chắn)
        // 2. Large screen + không phải mobile UA → DESKTOP (mặc định cho PC)
        // 3. Large screen + có real touch + pointer events → HYBRID
        // 4. Fallback → DESKTOP
        
        if (isMobileUA && isSmallScreen) {
            return 'MOBILE'; // Smartphone/tablet chắc chắn
        }
        
        if (!isMobileUA && !isSmallScreen) {
            // Desktop PC hoặc laptop với màn hình lớn
            if (hasRealTouch && hasPointerEvents && hasTouchPoints) {
                return 'HYBRID'; // Laptop touchscreen (Windows)
            }
            return 'DESKTOP'; // PC bình thường - MẶC ĐỊNH
        }
        
        // Small screen nhưng không phải mobile UA → tablet?
        if (hasRealTouch) {
            return 'MOBILE';
        }
        
        return 'DESKTOP'; // Fallback an toàn
    })();
    
    // Debug device detection
    console.log(`🖱️ Device Type: ${DEVICE_TYPE}`);
    console.log('📊 Device Info:', {
        hasTouch: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
        hasPointerEvents: window.PointerEvent !== undefined,
        isMobileUA: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isSmallScreen: window.matchMedia('(max-width: 768px)').matches,
        screenWidth: window.innerWidth,
        userAgent: navigator.userAgent
    });
    
    // Apply device-specific CSS
    document.documentElement.setAttribute('data-device-type', DEVICE_TYPE.toLowerCase());
    let themeChg = false;
    let supAch = false;
    let achQueue = [];
    let achQueueTimeout = null; // Track timeout to prevent race condition
    let lastUnlock = 0;
    let chDiff = null;
    let pendChWin = null;

    function drainAchievementQueue() {
        // Clear existing timeout to prevent race condition
        if (achQueueTimeout) {
            clearTimeout(achQueueTimeout);
            achQueueTimeout = null;
        }
        
        const runNext = () => {
            const fn = achQueue.shift();
            if (!fn) { 
                supAch = false; 
                achQueueTimeout = null;
                return; 
            }
            fn();
            // Track timeout for cleanup
            achQueueTimeout = setTimeout(runNext, CONSTANTS.ACHIEVEMENT_DISPLAY_DURATION);
        };
        runNext();
    }

    let sbOpt = {
        diskCount: 4,
        poleCount: 4,
        rule: 'classic',
        startPos: 'classic',
        target: 'any_other'
    };

    let sbConfigsCompleted = [];
    function loadSandboxConfigs() {
        try { sbConfigsCompleted = JSON.parse(localStorage.getItem('hanoi_sandbox_configs')) || []; } catch(e) { sbConfigsCompleted = []; }
    }
    function saveSandboxConfig(cfg) {
        const hash = `${cfg.poleCount}p_${cfg.diskCount}d_${cfg.rule}_${cfg.startPos}_${cfg.target}`;
        if (!sbConfigsCompleted.includes(hash)) {
            sbConfigsCompleted.push(hash);
            if (sbConfigsCompleted.length > 50) sbConfigsCompleted.shift();
            try { localStorage.setItem('hanoi_sandbox_configs', JSON.stringify(sbConfigsCompleted)); } catch(e) {}
            if (sbConfigsCompleted.length >= 10) { checkAchievements('sandbox_10_configs'); }
        }
    }
    function calculateCreativityScore() {
        const poles = document.querySelectorAll('.pole').length;
        let score = 0;
        score += n * 10;
        score += (poles - 3) * 25;
        if (sbOpt.rule === 'adjacent') score += 50;
        if (sbOpt.rule === 'cyclic') score += 60;
        if (sbOpt.startPos === 'spread') score += 40;
        if (sbOpt.startPos === 'last_pole') score += 30;
        if (sbOpt.target === 'last_pole') score += 20;
        if (undoCount === 0) score += 50;
        if (t0 && (Date.now() - t0) < 180000) score += 80;
        if (moves < 500) score += Math.floor((500 - moves) / 5);
        return Math.min(999, score);
    }

    const EMOJIS = {
        burger: ['🍔', '🍅', '🥬', '🧀', '🥩', '🍞', '🍞', '🍞'],
        rescue: ['🐱', '🐈', '😿', '😻', '🙀', '😽', '🦊', '🐻'],
        neon: ['⚡️', '💡', '🔮', '✨', '🔷', '🔶', '❇️', '✳️'],
        dark: ['🌙', '⭐', '🪐', '💫', '🌑', '🌕', '🌌', '☄️']
    };

    let unlockAch = [];
    let selTitle = null;
    const achievements = [
        { id: 'rookie', title: 'Tân Binh', description: 'Hoàn thành một game 3 đĩa.', icon: '🔰', check: () => n === 3 && MODE !== 'sandbox' },
        { id: 'architect', title: 'Kiến Trúc Sư', description: 'Hoàn thành một game 8 đĩa.', icon: '🏗️', check: () => n === 8 && MODE !== 'sandbox'},
        { id: 'optimal_master', title: 'Bậc Thầy Tối Ưu', description: 'Hoàn thành game với số bước tối thiểu.', icon: '🎯', check: () => (MODE !== 'sandbox' || sbOpt.rule === 'classic') && moves === (Math.pow(2, n) - 1) },
        { id: 'perfectionist', title: 'Người Cầu Toàn', description: 'Hoàn thành game 6+ đĩa tối ưu, không dùng Undo.', icon: '✨', check: () => n >= 6 && (MODE !== 'sandbox' || sbOpt.rule === 'classic') && moves === (Math.pow(2, n) - 1) && undoCount === 0 },
        { id: 'speedster', title: 'Tốc Độ', description: 'Chiến thắng ở chế độ Challenge (Vừa).', icon: '⚡', check: (status) => status === 'challenge_medium_win' },
        { id: 'godspeed', title: 'Thần Tốc', description: 'Chiến thắng ở chế độ Challenge (Khó).', icon: '🔥', check: (status) => status === 'challenge_hard_win' },
        { id: 'teacher', title: 'Người Thầy', description: 'Hoàn thành một game 4+ đĩa ở chế độ Teach.', icon: '🎓', check: () => MODE === 'teach' && n >= 4 },
        { id: 'scholar', title: 'Học Giả', description: 'Hoàn thành một game ở chế độ Learn.', icon: '🧠', check: () => MODE === 'learn' },
        { id: 'undoer', title: 'Người Thích Hoàn Tác', description: 'Sử dụng Undo 15 lần trong một game.', icon: '↩️', check: () => undoCount >= 15 },
        { id: 'collector', title: 'Nhà Sưu Tầm', description: 'Trải nghiệm một theme khác ngoài Classic.', icon: '🎨', check: () => themeChg },
        { id: 'pioneer', title: 'Nhà Tiên Phong', description: 'Hoàn thành một game ở chế độ Sandbox.', icon: '🚀', check: () => MODE === 'sandbox' },
        { id: 'good_try', title: 'Nỗ Lực Đáng Khen', description: 'Thất bại ở một màn Challenge.', icon: '😥', check: (status) => status === 'challenge_fail' },
        { id: 'learn_initiate', title: 'Học Đạo Nhập Môn', description: 'Bắt đầu chế độ Learn lần đầu tiên.', icon: '📘', check: (status) => status === 'enter_learn' },
        { id: 'observer', title: 'The Observer', description: 'Kích hoạt Auto-solve lần đầu tiên.', icon: '👀', check: (status) => status === 'start_auto' },
        { id: 'analysis_researcher', title: 'Nhà Phân Tích', description: 'Mở bảng 📊 Phân tích lần đầu.', icon: '📊', check: (status) => status === 'open_analysis' },
        { id: 'fs_initiate', title: 'Phòng Thí Nghiệm', description: 'Xem ước lượng Frame–Stewart trong Sandbox.', icon: '🧪', check: (status) => status === 'fs_insight' },
        { id: 'frame_master', title: 'Bậc Thầy 4 Cột', description: 'Sandbox 4 cột (classic) – hoàn thành tối ưu.', icon: '🧩', check: () => MODE === 'sandbox' && sbOpt.rule === 'classic' && document.querySelectorAll('.pole').length === 4 && moves === optimalMovesFor(4, n) },
        { id: 'five_sage', title: 'Ngũ Trụ', description: 'Sandbox 5 cột (classic) – hoàn thành tối ưu.', icon: '🥇', check: () => MODE === 'sandbox' && sbOpt.rule === 'classic' && document.querySelectorAll('.pole').length === 5 && moves === optimalMovesFor(5, n) },

        { id: 'adjacent_master', title: 'Bậc Thầy Liền Kề', description: '🔥 Sandbox: Adjacent rules – 5+ đĩa, không dùng Undo.', icon: '🔗', check: () => MODE === 'sandbox' && sbOpt.rule === 'adjacent' && n >= 5 && undoCount === 0 && !usedAuto },
        { id: 'cyclic_sage', title: 'Hiền Giả Tuần Hoàn', description: '🔥 Sandbox: Cyclic rules – 5+ đĩa, không dùng Undo.', icon: '🔄', check: () => MODE === 'sandbox' && sbOpt.rule === 'cyclic' && n >= 5 && undoCount === 0 && !usedAuto },
        { id: 'spread_genius', title: 'Thiên Tài Phân Tán', description: '🔥 Sandbox: Start position Spread – 6+ đĩa hoàn thành.', icon: '🌊', check: () => MODE === 'sandbox' && sbOpt.startPos === 'spread' && n >= 6 && !usedAuto },
        { id: 'reverse_architect', title: 'Kiến Trúc Đảo Ngược', description: '🔥 Sandbox: Start từ cột cuối – 6+ đĩa hoàn thành.', icon: '↩️', check: () => MODE === 'sandbox' && sbOpt.startPos === 'last_pole' && n >= 6 && !usedAuto },
        { id: 'minimalist', title: 'Người Tối Giản', description: '🔥 Sandbox: 3 cột, 8 đĩa, adjacent/cyclic – hoàn thành nhanh (<5 phút).', icon: '⚡', check: () => MODE === 'sandbox' && document.querySelectorAll('.pole').length === 3 && n === 8 && (sbOpt.rule === 'adjacent' || sbOpt.rule === 'cyclic') && t0 && (Date.now() - t0) <= 300000 && !usedAuto },
        { id: 'complexity_master', title: 'Chúa Tể Phức Tạp', description: '🔥 Sandbox: 6 cột, 8 đĩa, adjacent rules – hoàn thành.', icon: '🎭', check: () => MODE === 'sandbox' && document.querySelectorAll('.pole').length === 6 && n === 8 && sbOpt.rule === 'adjacent' && !usedAuto },
        { id: 'ultimate_combo', title: 'Combo Tối Thượng', description: '🔥 Sandbox: 6 cột, 8 đĩa, cyclic, spread start – hoàn thành.', icon: '💫', check: () => MODE === 'sandbox' && document.querySelectorAll('.pole').length === 6 && n === 8 && sbOpt.rule === 'cyclic' && sbOpt.startPos === 'spread' && !usedAuto },
        { id: 'creative_soul', title: 'Linh Hồn Sáng Tạo', description: '🔥 Sandbox: Hoàn thành 10 cấu hình khác nhau (tracked).', icon: '🎨', check: (status) => status === 'sandbox_10_configs' },
        { id: 'efficiency_god', title: 'Thần Hiệu Suất', description: '🔥 Sandbox: Adjacent 5+ đĩa, 4 cột, <300 bước.', icon: '⚙️', check: () => MODE === 'sandbox' && sbOpt.rule === 'adjacent' && n >= 5 && document.querySelectorAll('.pole').length === 4 && moves < 300 && !usedAuto },
        { id: 'sandbox_speedrun', title: 'Tốc Hành Sandbox', description: '🔥 Sandbox: 7 đĩa, bất kỳ rules, hoàn thành <3 phút.', icon: '🏃', check: () => MODE === 'sandbox' && n === 7 && t0 && (Date.now() - t0) <= 180000 && !usedAuto },
        { id: 'mad_scientist', title: 'Nhà Khoa Học Điên', description: '🔥 Sandbox: 6 cột, 8 đĩa, last_pole start, any rules.', icon: '🧪', check: () => MODE === 'sandbox' && document.querySelectorAll('.pole').length === 6 && n === 8 && sbOpt.startPos === 'last_pole' && !usedAuto },
        { id: 'sandbox_legend', title: 'Huyền Thoại Sandbox', description: '👑 Mở khóa 8+ achievements Sandbox đặc biệt.', icon: '🌟', check: () => { const sbAchs = ['adjacent_master','cyclic_sage','spread_genius','reverse_architect','minimalist','complexity_master','ultimate_combo','creative_soul','efficiency_god','sandbox_speedrun','mad_scientist']; return sbAchs.filter(id => unlockAch.includes(id)).length >= 8; } },

        { id: 'invincible', title: 'Bất Bại', description: '🔥 Hoàn thành 10+ đĩa tối ưu không dùng Undo (Play/Challenge).', icon: '💪', check: () => n >= 10 && (MODE === 'play' || MODE === 'challenge') && moves === (Math.pow(2, n) - 1) && undoCount === 0 && !usedAuto },
        { id: 'absolute_perfection', title: 'Hoàn Mỹ Tuyệt Đối', description: '🔥 Hoàn thành 12 đĩa tối ưu (Play).', icon: '💎', check: () => n === 12 && MODE === 'play' && moves === (Math.pow(2, n) - 1) && !usedAuto },
        { id: 'speedrun_legend', title: 'Huyền Thoại Tốc Độ', description: '🔥 Hoàn thành 8+ đĩa tối ưu trong 2 phút (Play).', icon: '⚡️', check: () => n >= 8 && MODE === 'play' && moves === (Math.pow(2, n) - 1) && t0 && (Date.now() - t0) <= 120000 && !usedAuto },
        { id: 'sandbox_architect', title: 'Kiến Trúc Sandbox', description: '🔥 Sandbox: 7+ cột (classic) hoàn thành tối ưu (CHỈ Sandbox).', icon: '🏛️', check: () => MODE === 'sandbox' && sbOpt.rule === 'classic' && document.querySelectorAll('.pole').length >= 7 && moves === optimalMovesFor(document.querySelectorAll('.pole').length, n) && !usedAuto },
        { id: 'ten_perfection', title: 'Thập Toàn Thập Mỹ', description: '🔥 Sandbox: 10+ đĩa, 4 cột tối ưu (CHỈ Sandbox).', icon: '🌟', check: () => MODE === 'sandbox' && sbOpt.rule === 'classic' && document.querySelectorAll('.pole').length === 4 && n >= 10 && moves === optimalMovesFor(4, n) && !usedAuto },
        { id: 'cosmic_master', title: 'Bậc Thầy Vũ Trụ', description: '🔥 Sandbox: 8+ đĩa, 6 cột tối ưu (CHỈ Sandbox).', icon: '🌌', check: () => MODE === 'sandbox' && sbOpt.rule === 'classic' && document.querySelectorAll('.pole').length === 6 && n >= 8 && moves === optimalMovesFor(6, n) && !usedAuto },
        { id: 'tower_lord', title: 'Tháp Chủ', description: 'Mở khóa tất cả các thành tích khác.', icon: '👑', check: () => unlockAch.length >= achievements.length - 1 }
    ];

    function loadAchievements() {
        try {
            unlockAch = JSON.parse(localStorage.getItem('hanoi_unlocked_achievements')) || [];
            selTitle = localStorage.getItem('hanoi_selected_title') || 'rookie';
            if (!unlockAch.includes('rookie')) {
                 unlockAch.push('rookie');
                 saveAchievements();
            }
            lastUnlock = unlockAch.length;
        } catch(e) {
            ErrLog.log(e, 'loadAchievements');
            unlockAch = ['rookie'];
            selTitle = 'rookie';
            lastUnlock = 1;
        }
    }
    function saveAchievements() {
        localStorage.setItem('hanoi_unlocked_achievements', JSON.stringify(unlockAch));
        localStorage.setItem('hanoi_selected_title', selTitle);
    }
    function unlockAchievement(id) {
        if (!unlockAch.includes(id)) {
            unlockAch.push(id);
            saveAchievements();
            const achievement = achievements.find(a => a.id === id);
            const showPopup = () => {
                achievementUnlockedPopup.innerHTML = `
                    <div style="font-size:28px;">🏆</div>
                    <div style="font-weight:900;font-size:20px;margin-top:6px">Danh hiệu mới</div>
                    <div style="margin-top:6px;font-weight:800">${achievement.title}</div>
                    <div style="color:var(--muted);margin-top:4px">${achievement.description}</div>
                `;
                achievementUnlockedPopup.classList.add('show');
                try { if (typeof confetti === 'function') confetti({ spread: 70, particleCount: 80, origin: { y: 0.2 } }); } catch(_) {}
                setTimeout(() => { achievementUnlockedPopup.classList.remove('show'); }, 2800);
            };
            if (supAch) { achQueue.push(showPopup); }
            else { showPopup(); }
            renderAchievements();
            const towerLordAch = achievements.find(a => a.id === 'tower_lord');
            if (towerLordAch && towerLordAch.check()) {
                unlockAchievement('tower_lord');
            }
        }
        
        // Track progress
        if (typeof window.GameEnhancements !== 'undefined') {
            if (id === 'undoer') window.GameEnhancements.updateAchievementProgress('undoer', undoCount, 15);
            else if (id === 'creative_soul') window.GameEnhancements.updateAchievementProgress('creative_soul', sbConfigsCompleted.length, 10);
        }
    }
    function checkAllAchievements(status = null) {
        achievements.forEach(ach => {
            if (ach.id === 'tower_lord') return;

            if (status) {
                if (ach.check(status)) {
                    unlockAchievement(ach.id);
                }
                return;
            }

            if (MODE === 'learn') {
                if (ach.id === 'learn_initiate' || ach.id === 'scholar') {
                    if (ach.check(status)) unlockAchievement(ach.id);
                }
                return;
            }

            if (usedAuto) {
                if (ach.id === 'observer') {
                    if (ach.check(status)) unlockAchievement(ach.id);
                }
                return;
            }

            if (MODE === 'teach') {
                if (ach.id === 'teacher' || ach.id === 'undoer' || ach.id === 'collector') {
                    if (ach.check(status)) unlockAchievement(ach.id);
                }
                return;
            }

            if (ach.check(status)) {
                unlockAchievement(ach.id);
            }
        });
    }
    function renderAchievements() {
        const listEl = document.getElementById('achievementsList');
        listEl.innerHTML = '';

        const revealIdx = new Set();
        achievements.forEach((a, idx) => {
            if (unlockAch.includes(a.id)) {
                for (let d = -2; d <= 2; d++) {
                    if (d === 0) continue;
                    const j = idx + d;
                    if (j >= 0 && j < achievements.length) revealIdx.add(j);
                }
            }
        });
        achievements.forEach((ach, idx) => {
            const isUnlocked = unlockAch.includes(ach.id);
            const isEquipped = selTitle === ach.id;
            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? '' : 'locked'}`;
            const isRevealedLocked = !isUnlocked && revealIdx.has(idx);
            // Sanitize all user-displayable content to prevent XSS
            const icon = isUnlocked ? sanitize(ach.icon) : (isRevealedLocked ? sanitize(ach.icon) : '❓');
            const title = sanitize(isUnlocked ? ach.title : (isRevealedLocked ? ach.title : '???'));
            const desc = sanitize(isUnlocked ? ach.description : (isRevealedLocked ? ach.description : '???'));
            const opacityStyle = !isUnlocked && isRevealedLocked ? 'style="opacity:.55"' : '';
            item.innerHTML = `
                <div class="icon">${icon}</div>
                <div class="details" ${opacityStyle}>
                    <h4>${title}</h4>
                    <p>${desc}</p>
                </div>
                <div class="title-reward ${isEquipped ? 'equipped' : ''}" data-id="${sanitize(ach.id)}">
                    ${isEquipped ? 'Đã trang bị' : isUnlocked ? 'Trang bị' : 'Đã khóa'}
                </div>
            `;
            if (isUnlocked) {
                item.querySelector('.title-reward').addEventListener('click', (e) => {
                    e.stopPropagation();
                    selTitle = ach.id;
                    saveAchievements();
                    updateTitleDisplay();
                    renderAchievements();
                });
            }
            
            // Progress bar update
            
            if (typeof window.enhanceAchievementDisplay !== 'undefined') {
                window.enhanceAchievementDisplay(item, ach.id, isUnlocked);
            }
            
            listEl.appendChild(item);
        });
    }
    function updateTitleDisplay() {
        const title = achievements.find(a => a.id === selTitle)?.title || '';
        titleDisplay.textContent = title;
    }

    function getBestKey(key) { return typeof key === 'string' && key.startsWith('sb_') ? `hanoi_best_v2_${key}` : `hanoi_best_v2_${key}_disks`; }
    function loadBest(key) { try { return JSON.parse(localStorage.getItem(getBestKey(key))) || {}; } catch (e) { return {}; } }
    function saveBest(key, score) { localStorage.setItem(getBestKey(key), JSON.stringify(score)); }
    function updateBestScoreDisplay() {
        n = Math.max(1, Math.min(12, parseInt(nE.value) || 4));
        bestNE.textContent = n;
        const best = loadBest(n);
        bE.textContent = (best && best.moves) ? `${best.moves}m / ${best.time}s` : '—';
    }

    function playSound(soundElement, volume = 0.7) {
        if (!soundElement || !sndE.checked || !soundElement.currentSrc) return;
        soundElement.currentTime = 0;
        soundElement.volume = volume;
        soundElement.play().catch(() => {});
    }
    function playBGM() {
        try {
            if (!bgmEl || !sndE.checked) return;

            if (!bgmEl.currentSrc || bgmEl.currentSrc === window.location.href) {
                const def = bgmEl.getAttribute('data-default-src');
                if (def) bgmEl.src = def;
            }
            bgmEl.muted = false;
            bgmEl.volume = 0.35;
            bgmEl.loop = true;

            const tryPlay = () => {
                const pr = bgmEl.play();
                if (pr && typeof pr.catch === 'function') {
                    pr.catch(() => {
                        try {
                            htE.innerHTML = '🔇 <strong>Âm thanh bị chặn</strong> - Click checkbox <label style="display:inline;cursor:pointer;"><input type="checkbox" id="audioRetry" style="vertical-align:middle;cursor:pointer;"> Âm</label> để bật lại';
                            const retryCheckbox = document.getElementById('audioRetry');
                            if (retryCheckbox) {
                                retryCheckbox.checked = false;
                                retryCheckbox.addEventListener('change', () => {
                                    if (retryCheckbox.checked) {
                                        sndE.checked = true;
                                        playBGM();
                                        htE.textContent = '—';
                                    }
                                });
                            }
                        } catch(_) {}
                    });
                }
            };
            if (bgmEl.readyState < 2) {
                const onReady = () => { bgmEl.removeEventListener('canplay', onReady); tryPlay(); };
                bgmEl.addEventListener('canplay', onReady, { once: true });
                bgmEl.load();
            } else {
                tryPlay();
            }
        } catch (_) {  }
    }
    function pauseBGM() { if (bgmEl) bgmEl.pause(); }

    function handleSoundUpload(e, audioKey) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size first (limit for audio to prevent localStorage overflow)
        const MAX_AUDIO_SIZE = CONSTANTS.MAX_AUDIO_SIZE_MB * 1024 * 1024;
        if (file.size > MAX_AUDIO_SIZE) {
            alert('File âm thanh quá lớn! Vui lòng chọn file nhỏ hơn 2MB.\n\nKích thước hiện tại: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
            e.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result;
            
            // Check localStorage capacity before saving
            try {
                const currentSize = new Blob([JSON.stringify(localStorage)]).size;
                const newDataSize = new Blob([base64Data]).size;
                const STORAGE_LIMIT = CONSTANTS.STORAGE_LIMIT_MB * 1024 * 1024;
                const availableSpace = STORAGE_LIMIT - currentSize;
                
                if (newDataSize > availableSpace) {
                    alert('Không đủ bộ nhớ! Cần ' + (newDataSize / 1024).toFixed(0) + 'KB nhưng chỉ còn ' + (availableSpace / 1024).toFixed(0) + 'KB.\n\nVui lòng xóa bộ nhớ đệm trong Cài đặt.');
                    e.target.value = '';
                    return;
                }
                
                localStorage.setItem(audioKey, base64Data);
                loadCustomSounds();
                if(audioKey === 'customBGM' && sndE.checked) {
                    pauseBGM();
                    playBGM();
                }
            } catch (err) {
                console.error('LocalStorage error:', err);
                alert('Lỗi: Không thể lưu file âm thanh.\n\n' + err.message + '\n\nThử xóa bộ nhớ đệm trong Cài đặt.');
                e.target.value = '';
            }
        };
        reader.readAsDataURL(file);
    }

    function loadCustomSounds() {
        Object.values(audEls).forEach(item => {
            const customSound = localStorage.getItem(item.key);
            const defaultSrc = item.el.getAttribute('data-default-src');

            if (customSound) {
                item.el.src = customSound;
                item.status.textContent = "Đã tùy chỉnh";
                item.status.style.color = 'var(--accent)';
            } else {
                item.el.src = defaultSrc;
                item.status.textContent = "Mặc định";
                 item.status.style.color = 'var(--muted)';
            }
            item.el.onerror = () => { // Audio fail
                if(defaultSrc) item.el.src = defaultSrc;
            };
        });
    }

    function resetCustomSounds() {
        Object.values(audEls).forEach(item => {
            localStorage.removeItem(item.key);
        });
        loadCustomSounds();
        if(sndE.checked) {
             pauseBGM();
             playBGM();
        }
    }

    function buildStage() {
        try {
            // Cleanup old disks and their event listeners to prevent memory leak
            const oldDisks = stage.querySelectorAll('.disk');
            oldDisks.forEach(disk => {
                // Desktop drag handlers
                const dragHandler = disk._dragstartHandler;
                if (dragHandler) disk.removeEventListener('dragstart', dragHandler);
                
                // Mobile touch handlers
                const touchStart = disk._touchStartHandler;
                const touchMove = disk._touchMoveHandler;
                const touchEnd = disk._touchEndHandler;
                if (touchStart) disk.removeEventListener('touchstart', touchStart);
                if (touchMove) disk.removeEventListener('touchmove', touchMove);
                if (touchEnd) disk.removeEventListener('touchend', touchEnd);
                
                // Hybrid pointer handlers
                const pointerDown = disk._pointerDownHandler;
                const pointerMove = disk._pointerMoveHandler;
                const pointerUp = disk._pointerUpHandler;
                if (pointerDown) disk.removeEventListener('pointerdown', pointerDown);
                if (pointerMove) disk.removeEventListener('pointermove', pointerMove);
                if (pointerUp) {
                    disk.removeEventListener('pointerup', pointerUp);
                    disk.removeEventListener('pointercancel', pointerUp);
                }
                
                disk.remove();
            });
            
            const isSandbox = MODE === 'sandbox';

            if (isSandbox) {
                n = sbOpt.diskCount;
            } else if (MODE === 'challenge') {

                n = Math.max(CONSTANTS.MIN_DISKS, Math.min(CONSTANTS.MAX_CHALLENGE_DISKS, n || 4));
                nE.value = n;
            } else {
                n = Math.max(CONSTANTS.MIN_DISKS, Math.min(CONSTANTS.MAX_DISKS, parseInt(nE.value) || 4));
                nE.value = n;
            }
            const poleCount = isSandbox ? sbOpt.poleCount : 3;

            stage.innerHTML = '';

            for (let i = 0; i < poleCount; i++) {
                const poleId = String.fromCharCode(65 + i).toLowerCase();
                const p = document.createElement('div');
                p.className = 'pole';
                p.id = poleId;
                p.innerHTML = `<div class="peg"></div><div class="pole-label">${i + 1}</div>`;
                addPoleListeners(p);
                stage.appendChild(p);
            }

            applyTheme();

            const theme = thE.value;
            const emojis = EMOJIS[theme];
            const poles = Array.from(stage.querySelectorAll('.pole'));

            for (let i = n; i >= 1; i--) {
                let targetPole;
                if (isSandbox) {
                    if (sbOpt.startPole) {
                        const idx = Math.max(0, poles.findIndex(p => p.id === sbOpt.startPole));
                        targetPole = poles[idx >= 0 ? idx : 0];
                    } else {
                        switch(sbOpt.startPos) {
                            case 'spread':
                                targetPole = poles[(n-i) % poleCount];
                                break;
                            case 'last_pole':
                                targetPole = poles[poleCount - 1];
                                break;
                            case 'classic':
                            default:
                                targetPole = poles[0];
                        }
                    }
                } else {
                    targetPole = poles[0];
                }

                const d = document.createElement('div');
                d.className = 'disk';
                d.id = `disk-${i}-${Math.floor(Math.random() * 1e6)}`;
                d.dataset.size = i;
                const width = CONSTANTS.DISK_BASE_WIDTH + i * CONSTANTS.DISK_WIDTH_INCREMENT;
                d.style.width = `${width}px`;
                d.style.background = diskCols[(i - 1) % diskCols.length];

                const lbl = document.createElement('div');
                lbl.className = 'disk--label';

                let emoji = (emojis && i <= emojis.length) ? emojis[i - 1] : null;
                let labelContent = '';

                if (emoji) {
                    labelContent = `<span class="emoji" role="img" aria-label="disk icon">${emoji}</span><span class="num">${i}</span>`;
                } else {
                    labelContent = `<span class="num">${i}</span>`;
                }
                lbl.innerHTML = labelContent;

                d.appendChild(lbl);
                d.style.zIndex = CONSTANTS.DISK_BASE_ZINDEX + i;
                
                // ====== DEVICE-SPECIFIC INTERACTION SETUP ======
                // Chỉ bind events phù hợp với device type để tránh conflict
                
                if (DEVICE_TYPE === 'DESKTOP' || DEVICE_TYPE === 'TOUCH_DESKTOP') {
                    // ===== DESKTOP: Dùng HTML5 Drag & Drop API =====
                    d.draggable = true;
                    console.log(`✅ Disk ${i}: Using DESKTOP drag events`);
                    
                    const dragstartHandler = (ev) => {
                        console.log('🎯 DRAGSTART fired!', { diskId: d.id, run });
                        if (!run) {
                            try { 
                                ev.dataTransfer.setData('text/plain', d.id); 
                                ev.dataTransfer.effectAllowed = 'move'; 
                                console.log('✅ DataTransfer set successfully');
                            } catch (e) {
                                console.error('❌ DataTransfer error:', e);
                            }
                            
                            if (!t0 && !chActive) { 
                                t0 = Date.now(); 
                                if (tmr) clearInterval(tmr);
                                tmr = setInterval(() => { 
                                    tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) 
                                }, 250);
                            }
                            playSound(pickupSnd);
                        } else {
                            console.log('⚠️ Drag prevented - auto-solve running');
                            ev.preventDefault();
                        }
                    };
                    
                    d._dragstartHandler = dragstartHandler;
                    d.addEventListener('dragstart', dragstartHandler);
                    
                } else if (DEVICE_TYPE === 'MOBILE') {
                    // ===== MOBILE: Dùng Touch Events =====
                    d.draggable = false; // Tắt HTML5 drag
                    console.log(`📱 Disk ${i}: Using MOBILE touch events`);
                    
                    const touchStartHandler = (e) => {
                        if (run) return;
                        
                        // CHỈ prevent default nếu đây là top disk (có thể kéo được)
                        const diskEl = d;
                        const poleEl = diskEl.parentElement;
                        const disksInPole = poleEl.querySelectorAll('.disk');
                        const topDisk = disksInPole[disksInPole.length - 1];
                        
                        if (diskEl !== topDisk) return; // Không phải top disk, cho phép scroll
                        
                        e.preventDefault(); // Prevent scrolling CHỈ KHI kéo disk
                        
                        const touch = e.touches[0];
                        
                        // Start timer if needed
                        if (!t0 && !chActive) {
                            t0 = Date.now();
                            if (tmr) clearInterval(tmr);
                            tmr = setInterval(() => { 
                                tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) 
                            }, 250);
                        }
                        
                        touchState.active = true;
                        touchState.diskId = diskEl.id;
                        touchState.fromPole = poleEl.id;
                        touchState.initialY = touch.clientY;
                        touchState.currentY = touch.clientY;
                        
                        diskEl.classList.add('held');
                        playSound(pickupSnd);
                    };
                    
                    const touchMoveHandler = (e) => {
                        if (!touchState.active || touchState.diskId !== d.id) return;
                        e.preventDefault();
                        
                        const touch = e.touches[0];
                        touchState.currentY = touch.clientY;
                        
                        // Visual feedback - lift disk
                        const deltaY = touchState.initialY - touchState.currentY;
                        if (deltaY > 10) {
                            d.style.transform = `translateY(-${Math.min(deltaY, 50)}px)`;
                        }
                    };
                    
                    const touchEndHandler = (e) => {
                        if (!touchState.active || touchState.diskId !== d.id) return;
                        
                        d.classList.remove('held');
                        d.style.transform = '';
                        
                        // Find which pole the touch ended on
                        const touch = e.changedTouches[0];
                        const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
                        let targetPole = elementAtPoint?.closest('.pole');
                        
                        if (targetPole && isValidMove(touchState.fromPole, targetPole.id, d.dataset.size)) {
                            executeMove(touchState.fromPole, targetPole.id);
                        } else {
                            showErrorPopup();
                        }
                        
                        // Reset state
                        touchState.active = false;
                        touchState.diskId = null;
                        touchState.fromPole = null;
                    };
                    
                    d._touchStartHandler = touchStartHandler;
                    d._touchMoveHandler = touchMoveHandler;
                    d._touchEndHandler = touchEndHandler;
                    
                    d.addEventListener('touchstart', touchStartHandler, { passive: false });
                    d.addEventListener('touchmove', touchMoveHandler, { passive: false });
                    d.addEventListener('touchend', touchEndHandler);
                    
                } else if (DEVICE_TYPE === 'HYBRID') {
                    // ===== HYBRID: Dùng Pointer Events (tốt nhất) =====
                    d.draggable = false; // Tắt HTML5 drag
                    d.style.touchAction = 'none'; // Tắt browser default touch behaviors
                    console.log(`🎯 Disk ${i}: Using HYBRID pointer events`);
                    
                    let pointerState = {
                        active: false,
                        pointerId: null,
                        diskId: null,
                        fromPole: null,
                        initialY: 0
                    };
                    
                    const pointerDownHandler = (e) => {
                        if (run) return;
                        
                        const diskEl = d;
                        const poleEl = diskEl.parentElement;
                        const disksInPole = poleEl.querySelectorAll('.disk');
                        const topDisk = disksInPole[disksInPole.length - 1];
                        
                        if (diskEl !== topDisk) return;
                        
                        e.preventDefault();
                        diskEl.setPointerCapture(e.pointerId);
                        
                        if (!t0 && !chActive) {
                            t0 = Date.now();
                            if (tmr) clearInterval(tmr);
                            tmr = setInterval(() => { 
                                tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) 
                            }, 250);
                        }
                        
                        pointerState.active = true;
                        pointerState.pointerId = e.pointerId;
                        pointerState.diskId = diskEl.id;
                        pointerState.fromPole = poleEl.id;
                        pointerState.initialY = e.clientY;
                        
                        diskEl.classList.add('held');
                        playSound(pickupSnd);
                    };
                    
                    const pointerMoveHandler = (e) => {
                        if (!pointerState.active || pointerState.pointerId !== e.pointerId) return;
                        
                        const deltaY = pointerState.initialY - e.clientY;
                        if (deltaY > 10) {
                            d.style.transform = `translateY(-${Math.min(deltaY, 50)}px)`;
                        }
                    };
                    
                    const pointerUpHandler = (e) => {
                        if (!pointerState.active || pointerState.pointerId !== e.pointerId) return;
                        
                        d.classList.remove('held');
                        d.style.transform = '';
                        
                        const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
                        let targetPole = elementAtPoint?.closest('.pole');
                        
                        if (targetPole && isValidMove(pointerState.fromPole, targetPole.id, d.dataset.size)) {
                            executeMove(pointerState.fromPole, targetPole.id);
                        } else {
                            showErrorPopup();
                        }
                        
                        pointerState.active = false;
                        pointerState.pointerId = null;
                        pointerState.diskId = null;
                        pointerState.fromPole = null;
                    };
                    
                    d._pointerDownHandler = pointerDownHandler;
                    d._pointerMoveHandler = pointerMoveHandler;
                    d._pointerUpHandler = pointerUpHandler;
                    
                    d.addEventListener('pointerdown', pointerDownHandler);
                    d.addEventListener('pointermove', pointerMoveHandler);
                    d.addEventListener('pointerup', pointerUpHandler);
                    d.addEventListener('pointercancel', pointerUpHandler);
                }
                
                targetPole.appendChild(d);
            }

            moves = 0; 
            mvE.textContent = moves; 
            tE.textContent = '00:00'; 
            if (tmr) clearInterval(tmr); 
            tmr = null;
            t0 = null; 
            prgE.style.width = '0%'; 
            htE.textContent = '—';
            mvHist = [];
            undoCount = 0;
            usedAuto = false;
            lastUnlock = unlockAch.length;
            updateUndoButton();
            if (!isSandbox) updateBestScoreDisplay();

            if (isSandbox) {
                const firstPoleWithDisks = poles.find(p => p.querySelectorAll('.disk').length === n);
                if (firstPoleWithDisks) sbOpt.startPole = firstPoleWithDisks.id;
                updateFsInfo();
            }

            updateTopDisks();
            
            // DEBUG: Verify draggable state after setup
            if (DEVICE_TYPE === 'DESKTOP' || DEVICE_TYPE === 'TOUCH_DESKTOP') {
                console.log('🔍 Post-updateTopDisks verification:');
                stage.querySelectorAll('.disk').forEach(d => {
                    const hasHandler = !!d._dragstartHandler;
                    console.log(`  ${d.id}: draggable=${d.draggable}, hasHandler=${hasHandler}, pointerEvents="${d.style.pointerEvents}"`);
                });
            }
        } catch(e) {
            console.error('buildStage ERROR:', e);

            stage.innerHTML = '';
            for(let i=0; i<3; i++) {
                const p = document.createElement('div');
                p.className = 'pole';
                p.id = String.fromCharCode(97+i);
                p.innerHTML = `<div class="peg"></div><div class="pole-label">${i+1}</div>`;
                stage.appendChild(p);
            }
        }
    }

    function addPoleListeners(poleElement) {
        // Remove old listeners first to prevent memory leak
        const oldDragover = poleElement._dragoverHandler;
        const oldDrop = poleElement._dropHandler;
        if (oldDragover) poleElement.removeEventListener('dragover', oldDragover);
        if (oldDrop) poleElement.removeEventListener('drop', oldDrop);
        
        // Create new handlers
        const dragoverHandler = (e) => { e.preventDefault(); };
        const dropHandler = (e) => {
            e.preventDefault();
            const diskId = e.dataTransfer.getData('text/plain');
            const disk = document.getElementById(diskId);
            if (!disk) return;
            const from = disk.parentElement ? disk.parentElement.id : null;
            if (isValidMove(from, poleElement.id, disk.dataset.size)) {
                if (from) executeMove(from, poleElement.id);
            } else {
                showErrorPopup();
            }
        };
        
        // Store handlers for later cleanup
        poleElement._dragoverHandler = dragoverHandler;
        poleElement._dropHandler = dropHandler;
        
        // Add new listeners
        poleElement.addEventListener('dragover', dragoverHandler);
        poleElement.addEventListener('drop', dropHandler);
    }

    function applyTheme() { document.getElementById('app').className = `app theme--${thE.value}`; }

    function updateTopDisks() {
        document.querySelectorAll('.pole').forEach(p => {
            const ds = p.querySelectorAll('.disk');
            ds.forEach(x => { 
                x.classList.remove('small');
                // CRITICAL FIX: Không set pointer-events: none cho DESKTOP
                // vì HTML5 Drag API cần pointer events enabled
                // Thay vào đó, disable draggable attribute
                if (DEVICE_TYPE === 'DESKTOP' || DEVICE_TYPE === 'TOUCH_DESKTOP') {
                    x.draggable = false; // Non-top disks không kéo được
                    x.style.pointerEvents = ''; // CLEAR style để CSS mặc định hoạt động
                    x.style.cursor = 'not-allowed'; // Visual feedback
                } else {
                    x.style.pointerEvents = 'none'; // Mobile: block pointer hoàn toàn
                }
            });
            if (ds.length) {
                const topDisk = ds[ds.length - 1];
                topDisk.classList.add('small');
                if (DEVICE_TYPE === 'DESKTOP' || DEVICE_TYPE === 'TOUCH_DESKTOP') {
                    topDisk.draggable = true; // Enable drag cho top disk
                    topDisk.style.pointerEvents = ''; // CLEAR để ensure không bị block
                    topDisk.style.cursor = 'grab'; // Visual feedback
                } else {
                    topDisk.style.pointerEvents = 'auto'; // Mobile: enable pointer
                }
            }
        });
    }

    function isValidMove(fromId, toId, s) {
        const toPole = document.getElementById(toId);
        const topDisk = [...toPole.querySelectorAll('.disk')].pop();
        if (topDisk && +topDisk.dataset.size < +s) {
            errorPopupText.textContent = 'Không được đặt đĩa lớn lên trên đĩa nhỏ hơn.';
            return false;
        }

        if (MODE === 'sandbox') {
            const poles = Array.from(document.querySelectorAll('.pole')).map(p => p.id);
            const fromIndex = poles.indexOf(fromId);
            const toIndex = poles.indexOf(toId);

            if (sbOpt.rule === 'adjacent' && Math.abs(fromIndex - toIndex) !== 1) {
                errorPopupText.textContent = 'Luật liền kề: Chỉ được di chuyển giữa các cột ngay cạnh nhau.';
                return false;
            }
            if (sbOpt.rule === 'cyclic') {
                 const nextPoleIndex = (fromIndex + 1) % poles.length;
                 if (nextPoleIndex !== toIndex) {
                    errorPopupText.textContent = 'Luật tuần hoàn: Chỉ được di chuyển theo chiều kim đồng hồ tới cột kế tiếp (vd: 1→2, 2→3, 3→1).';
                    return false;
                 }
            }
        }
        return true;
    }

    function executeMove(from, to) {

        if (!t0 && !chActive) {
            t0 = Date.now();
            // Clear old timer first to prevent leak
            if (tmr) clearInterval(tmr);
            tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
        }

        if (MODE === 'teach') {
            const expectedMove = seq[ix];
            if (from === expectedMove[0] && to === expectedMove[1]) {
                mvHist.push({ from, to });
                performMove(from, to);
                if (++ix < seq.length) {
                    highlightTeachMove();
                } else {
                    stopAutoSolver();
                    checkWinCondition();
                }
            } else {
                playSound(errorSnd);
                htE.textContent = 'Sai rồi! Hoàn tác để thử lại.';
            }
        } else {
            mvHist.push({ from, to });
            performMove(from, to);
        }
        updateUndoButton();
    }

    function performMove(from, to) {
        const s = document.getElementById(from);
        const d = document.getElementById(to);
        let disk = s ? [...s.querySelectorAll('.disk')].pop() : null;
        if (!disk) return;
        d.appendChild(disk);
        moves++;
        mvE.textContent = moves;
        playSound(dropSnd);
        updateTopDisks();
        updateProgressBar();
        saveGameState();
        if (!run) checkWinCondition();
    }

    function updateProgressBar() {
        if (MODE === 'sandbox' || n > 8) {
            prgE.parentElement.style.display = 'none';
            return;
        }
        prgE.parentElement.style.display = '';
        const tot = Math.pow(2, n) - 1;
        prgE.style.width = `${Math.min(100, (moves / tot) * 100)}%`;
    }

    function checkWinCondition() {
        const poles = Array.from(document.querySelectorAll('.pole'));
        let won = false;

        if (MODE === 'sandbox') {
            const startPoleId = sbOpt.startPole || poles[0].id;
            
            if (sbOpt.target === 'any_other') {
                for (let pole of poles) {
                    if (pole.id !== startPoleId && pole.querySelectorAll('.disk').length === n) {
                        won = true;
                        break;
                    }
                }
            } else if (sbOpt.target === 'last_pole') {
                const lastPole = poles[poles.length - 1];
                if (lastPole.querySelectorAll('.disk').length === n) {
                    won = true;
                }
            } else {
                const targetPole = document.getElementById(sbOpt.target);
                if (targetPole && targetPole.querySelectorAll('.disk').length === n) {
                    won = true;
                }
            }
        } else {
            const targetPole = poles[poles.length - 1];
            if (targetPole && targetPole.querySelectorAll('.disk').length === n) {
                won = true;
            }
        }

        if (won) {
            saveIfBestScore();
            saveLeaderboardOnWin();
            supAch = true;
            checkAllAchievements();
            showFinishPopup();
            if (chActive) successChallenge();
            
            // Track stats
            if (typeof window.GameEnhancements !== 'undefined') {
                const opt = MODE === 'sandbox' ? 0 : Math.pow(2, n) - 1;
                const isOpt = opt > 0 && moves === opt;
                const sec = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
                window.GameEnhancements.trackGameCompletion(MODE, moves, sec, opt, isOpt);
                
                if (MODE === 'sandbox' && window._isDailyChallenge) {
                    window.GameEnhancements.completeDailyChallenge();
                    window._isDailyChallenge = false;
                }
            }
        }
    }

    function showFinishPopup() {
        const tSeconds = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
        const tStr = formatTime(tSeconds);
        const newTitleUnlocked = unlockAch.length > lastUnlock;

        let popupToShow, statsEl;

        if (usedAuto && MODE !== 'teach') {
            popupToShow = document.getElementById('winAutoSolve');
            statsEl = document.getElementById('winAutoSolveStats');
            const optimal = Math.pow(2, n) - 1;
            statsEl.innerHTML = `${moves} bước (Tối ưu: ${optimal}) | ${tStr}`;

            playSound(winSnd, 0.5);
            const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: 0.9 });
            }, 300);
        }

        else if (MODE === 'teach') {
            popupToShow = document.getElementById('winTeach');
            statsEl = document.getElementById('winTeachStats');
            const optimal = Math.pow(2, n) - 1;
            statsEl.innerHTML = `${moves}/${optimal} bước | ${tStr}`;

            playSound(winSnd, 0.5);
            const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: 0.9 });
            }, 300);
        }

        else if (MODE === 'learn') {
            popupToShow = document.getElementById('winLearn');
            statsEl = document.getElementById('winLearnStats');
            const optimal = Math.pow(2, n) - 1;
            statsEl.innerHTML = `${moves}/${optimal} bước | ${tStr}`;

            playSound(winSnd, 0.5);
            const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: 0.9 });
            }, 300);
        }

        else if (MODE === 'sandbox') {
            const isSandbox = true;
            const poles = document.querySelectorAll('.pole').length;
            const isClassic = sbOpt.rule === 'classic';
            const creativityScore = calculateCreativityScore();
            
            saveSandboxConfig({ poleCount: poles, diskCount: n, rule: sbOpt.rule, startPos: sbOpt.startPos, target: sbOpt.target });
            
            popupToShow = document.getElementById('winSandbox');
            statsEl = document.getElementById('winSandboxStats');
            
            const ruleNames = { classic: 'Cổ điển', adjacent: 'Liền kề', cyclic: 'Tuần hoàn' };
            const startNames = { classic: 'Cột 1', spread: 'Phân tán', last_pole: 'Cột cuối' };
            
            let badge = '🥉';
            let badgeText = 'Thí nghiệm thành công';
            if (creativityScore >= 600) { badge = '💎'; badgeText = 'Thiên tài sáng tạo!'; }
            else if (creativityScore >= 450) { badge = '🏆'; badgeText = 'Xuất sắc!'; }
            else if (creativityScore >= 300) { badge = '🥇'; badgeText = 'Rất tốt!'; }
            else if (creativityScore >= 200) { badge = '🥈'; badgeText = 'Tốt lắm!'; }
            
            let optimal = null;
            if (isClassic && poles === 3) optimal = Math.pow(2, n) - 1;
            else if (isClassic) optimal = optimalMovesFor(poles, n);
            
            let perfText = '';
            if (optimal && moves === optimal) perfText = '<div style="color:#fbbf24;font-weight:900;margin-top:6px">⚡ TỐI ƯU HOÀN HẢO!</div>';
            
            const sbKey = `sb_${poles}p_${n}d_${sbOpt.rule}`;
            const bestData = loadBest(sbKey);
            let bestText = '';
            if (bestData.moves) {
                const isNewBest = moves < bestData.moves || (moves === bestData.moves && tSeconds < bestData.time);
                if (isNewBest) {
                    bestText = '<div style="margin-top:6px;color:#10b981;font-weight:700;font-size:12px">🏆 Kỷ lục mới!</div>';
                } else {
                    bestText = `<div style="margin-top:6px;opacity:0.7;font-size:12px">Best: ${bestData.moves} bước | ${formatTime(bestData.time)}</div>`;
                }
            }
            
            statsEl.innerHTML = `
                <div style="font-size:36px;margin-bottom:8px">${badge}</div>
                <div style="font-weight:800;font-size:16px;margin-bottom:6px">${badgeText}</div>
                <div style="font-size:14px;opacity:0.9;margin:8px 0">
                    ${moves} bước | ${tStr}
                </div>
                <div style="background:rgba(139,92,246,0.12);padding:10px;border-radius:8px;margin-top:10px;text-align:left;font-size:13px">
                    <div style="margin-bottom:4px"><b>🎯 Cấu hình:</b> ${poles} cột × ${n} đĩa</div>
                    <div style="margin-bottom:4px"><b>⚙️ Luật:</b> ${ruleNames[sbOpt.rule]}</div>
                    <div style="margin-bottom:4px"><b>📍 Start:</b> ${startNames[sbOpt.startPos]}</div>
                    ${bestText}
                    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(139,92,246,0.2)">
                        <b>✨ Creativity Score:</b> <span style="font-size:18px;font-weight:900;color:#8b5cf6">${creativityScore}</span>/999
                    </div>
                    <div style="margin-top:4px;font-size:11px;opacity:0.7">
                        🧪 Đã hoàn thành ${sbConfigsCompleted.length} cấu hình khác nhau
                    </div>
                </div>
                ${perfText}
            `;

            playSound(winSnd, 0.5);
            const colors = creativityScore >= 600 ? ['#fbbf24','#f59e0b','#d97706'] : ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
            setTimeout(() => {
                safeConfetti({ particleCount: 150, angle: 60, spread: 60, origin: { x: 0 }, colors: colors, scalar: 1.2 });
                safeConfetti({ particleCount: 150, angle: 120, spread: 60, origin: { x: 1 }, colors: colors, scalar: 1.2 });
            }, 100);
            setTimeout(() => {
                safeConfetti({ particleCount: creativityScore >= 600 ? 200 : 100, spread: 100, origin: { y: 0.6 }, colors: colors, scalar: creativityScore >= 600 ? 1.3 : 0.9 });
            }, 300);
        }

        else {
            const inSandbox = MODE === 'sandbox';
            const k = inSandbox ? document.querySelectorAll('.pole').length : 3;
            const isClassicRules = !inSandbox || (sbOpt.rule === 'classic');

            let optimal;
            if (inSandbox && sbOpt.rule === 'classic') {
                optimal = (k === 3) ? Math.pow(2, n) - 1 : optimalMovesFor(k, n);
            } else if (!inSandbox) {
                optimal = Math.pow(2, n) - 1;
            } else {
                optimal = null;
            }

            if (optimal !== null && moves === optimal) {

                popupToShow = document.getElementById('winPerfect');
                statsEl = document.getElementById('winPerfectStats');
                statsEl.innerHTML = `${moves} bước ⚡ ${tStr}`;
                triggerWinEffects(true, newTitleUnlocked);
            } else if (optimal !== null && moves > optimal && moves <= optimal + 3) {

                popupToShow = document.getElementById('winGood');
                statsEl = document.getElementById('winGoodStats');
                statsEl.innerHTML = `${moves} bước (+${moves - optimal}) | ${tStr}`;
                triggerWinEffects(false, newTitleUnlocked);
            } else {

                popupToShow = document.getElementById('winSuccess');
                statsEl = document.getElementById('winSuccessStats');
                statsEl.innerHTML = `${moves} bước | ${tStr}`;
                triggerWinEffects(false, newTitleUnlocked);
            }
        }

        const closePopupAndContinue = () => {
            if (popupToShow) popupToShow.style.display = 'none';
            const showChal = (lvl) => {
                const id = lvl === 'hard' ? 'challengeWinHard' : (lvl === 'medium' ? 'challengeWinMedium' : 'challengeWinEasy');
                const el = document.getElementById(id);
                if (!el) { drainAchievementQueue(); return; }
                el.style.display = 'flex';
                const btn = el.querySelector('button');
                const close = () => { el.style.display = 'none'; btn.removeEventListener('click', close); drainAchievementQueue(); };
                if (btn) btn.addEventListener('click', close);
            };
            if (pendChWin) { const lvl = pendChWin; pendChWin = null; showChal(lvl); }
            else { drainAchievementQueue(); }
        };

        const closeBtn = popupToShow ? popupToShow.querySelector('button') : null;
        if (closeBtn) {
            const handleClose = () => {
                closeBtn.removeEventListener('click', handleClose);
                closePopupAndContinue();
            };
            closeBtn.addEventListener('click', handleClose);
        }

        if (popupToShow) popupToShow.style.display = 'flex';
    }

    function triggerWinEffects(isOptimal, newTitleUnlocked) {
        playSound(winSnd, 0.5);

        const colors = ['#2b8cff', '#6fd3ff', '#f39c12', '#e74c3c', '#2ecc71'];

        function launchFromCorners(particleCount, spread, scalar = 1) {
            safeConfetti({ particleCount: particleCount, angle: 60, spread: spread, origin: { x: 0 }, colors: colors, scalar: scalar });
            safeConfetti({ particleCount: particleCount, angle: 120, spread: spread, origin: { x: 1 }, colors: colors, scalar: scalar });
        }

        function launchFromTop(particleCount, spread, scalar = 1) {
            safeConfetti({ particleCount: particleCount, angle: 75, spread: spread, origin: { x: 0.25, y: 0 }, colors: colors, scalar: scalar });
            safeConfetti({ particleCount: particleCount, angle: 90, spread: spread, origin: { x: 0.5, y: 0 }, colors: colors, scalar: scalar });
            safeConfetti({ particleCount: particleCount, angle: 105, spread: spread, origin: { x: 0.75, y: 0 }, colors: colors, scalar: scalar });
        }

        if (newTitleUnlocked) {
            playSound(fireworksSnd, 0.8);
            launchFromCorners(150, 100, 2.0);
            launchFromTop(120, 80, 1.8);
            setTimeout(() => {
                safeConfetti({ particleCount: 150, spread: 360, ticks: 100, gravity: 0, decay: 0.94, origin: { y: 0.4 }, shapes: ['star'], colors: ['#FFC700', '#FF0000', '#FFFFFF']});
            }, 300);
        } else if (isOptimal) {
            playSound(fireworksSnd, 0.6);
            launchFromCorners(120, 80, 1.5);
            launchFromTop(100, 60, 1.2);
            setTimeout(() => {
                safeConfetti({ particleCount: 80, spread: 360, ticks: 100, gravity: 0, decay: 0.94, origin: { y: 0.5 }, shapes: ['star'], colors: ['#FFC700', '#FFD700', '#FFFFFF']});
            }, 200);
        } else {
            launchFromCorners(100, 60, 1.2);
        }
        lastUnlock = unlockAch.length;
    }

    (function setupPopupA11y() {
        const POPUPS = ['errorPopup','hintPopup','challengeDifficultyPopup','achievementsPopup','settingsPopup','loserPopup','sandboxSetupPopup','winPerfect','winGood','winSuccess','winAutoSolve','winTeach','winLearn'];
        let lastFocusedEl = null;

        function getVisiblePopups() {
            return POPUPS.map(id => document.getElementById(id)).filter(el => el && getComputedStyle(el).display !== 'none');
        }
        function focusableIn(el) {
            return el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        }
        function trap(el) {
            const f = focusableIn(el);
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            function onKey(e) {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            }
            el._trapHandler = onKey;
            el.addEventListener('keydown', onKey);
            first.focus();
        }
        function untrap(el) {
            if (el && el._trapHandler) { el.removeEventListener('keydown', el._trapHandler); delete el._trapHandler; }
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (!(m.target instanceof HTMLElement)) return;
                if (!m.target.classList.contains('popup')) return;
                const el = m.target;
                const visible = getComputedStyle(el).display !== 'none';
                if (visible) {
                    lastFocusedEl = document.activeElement;
                    trap(el);
                } else {
                    untrap(el);
                    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
                        try { lastFocusedEl.focus(); } catch(_) {}
                    }
                }
            });
        });
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });

        window.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const visibles = getVisiblePopups();
            if (visibles.length) {
                e.preventDefault();
                visibles.forEach(p => { p.style.display = 'none'; });
            }
        });
    })();

    function saveIfBestScore() {
        if (!t0) return;
        if (usedAuto && MODE !== 'sandbox') return;

        const t = Math.floor((Date.now() - t0) / 1000);
        if (t < 0 || t > 86400) return;

        let key;
        if (MODE === 'sandbox') {
            const poles = document.querySelectorAll('.pole').length;
            key = `sb_${poles}p_${n}d_${sbOpt.rule}`;
        } else {
            key = `${n}`;
        }

        const best = loadBest(key);
        if (!best.moves || moves < best.moves || (moves === best.moves && t < best.time)) {
            saveBest(key, { moves: moves, time: t });
            if (MODE !== 'sandbox') updateBestScoreDisplay();
        }
    }

    function successChallenge() {
        const difficulty = chDiff || (chLimit < (Math.pow(2, n) - 1) * 2 ? 'hard' : 'medium');
        pendChWin = difficulty;
        checkAllAchievements(chActive ? `challenge_${difficulty}_win` : null);
        chActive = false;
        clearInterval(chTimer);
    }
    function failChallenge() {
        chActive = false;
        checkAllAchievements('challenge_fail');
        loserPopup.querySelector('.popup-box div').innerHTML = "Hết giờ rồi! ⏳<br>Cố gắng lần sau nhé!";
        loserPopup.style.display = 'flex';
    }
    function startChallengeFor(diskCount, difficulty) {
        chDiff = difficulty;
        const optimalMoves = Math.pow(2, diskCount) - 1;
        let timePerMove;
        switch (difficulty) {
            case 'easy': timePerMove = 4; break;
            case 'medium': timePerMove = 2.5; break;
            case 'hard': timePerMove = 1.5; break;
            default: timePerMove = 2.5;
        }
        chLimit = Math.ceil(optimalMoves * timePerMove) + 5;
        chDead = Date.now() + chLimit * 1000;
        chActive = true;
        tE.textContent = formatTime(chLimit);
        // Clear old timer first
        if (chTimer) clearInterval(chTimer);
        chTimer = setInterval(() => {
            // Defensive check: if challenge is no longer active, stop timer
            if (!chActive) {
                clearInterval(chTimer);
                return;
            }
            const rem = Math.max(0, Math.ceil((chDead - Date.now()) / 1000));
            tE.textContent = formatTime(rem);
            if (rem <= 0) {
                clearInterval(chTimer);
                let hasWon = false;
                document.querySelectorAll('.pole').forEach((pole, index) => {
                    if (index > 0 && pole.querySelectorAll('.disk').length === n) {
                        hasWon = true;
                    }
                });
                if (!hasWon) {
                    failChallenge();
                }
            }
        }, 250);
    }

    function generateHanoiSequence(k, f, t, a, r) { if (k <= 0) return; generateHanoiSequence(k - 1, f, a, t, r); r.push([f, t]); generateHanoiSequence(k - 1, a, t, f, r); }

    const FS_MEMO = new Map();
    const FS_SPLIT = new Map();
    const MAX_FS_CACHE_SIZE = CONSTANTS.MAX_FS_CACHE_SIZE; // Limit cache size to prevent memory overflow
    
    function fsKey(k, n) { return `${k}:${n}`; }
    function optimalMovesFor(k, n) {
        if (n <= 0) return 0;
        if (k <= 3) return Math.pow(2, n) - 1;
        const key = fsKey(k, n);
        if (FS_MEMO.has(key)) return FS_MEMO.get(key);
        
        // Clear cache if too large to prevent overflow
        if (FS_MEMO.size > MAX_FS_CACHE_SIZE) {
            FS_MEMO.clear();
            FS_SPLIT.clear();
        }
        let best = Infinity, bestT = 1;
        for (let t = 1; t < n; t++) {
            const val = 2 * optimalMovesFor(k, t) + optimalMovesFor(k - 1, n - t);
            if (val < best) { best = val; bestT = t; }
        }
        FS_MEMO.set(key, best);
        FS_SPLIT.set(key, bestT);
        return best;
    }
    function generateFSSequence(n, pegs, fromIdx, toIdx, out, phase = 0) {

        const k = pegs.length;
        if (n <= 0) return;
        if (k <= 3) { generateHanoiSequence(n, pegs[fromIdx], pegs[toIdx], pegs.find((_,i)=>i!==fromIdx && i!==toIdx), out); return; }
        if (n === 1) { out.push([pegs[fromIdx], pegs[toIdx], phase || 2]); return; }
        const key = fsKey(k, n);
        const t = FS_SPLIT.has(key) ? FS_SPLIT.get(key) : 1;
        const auxIdxs = pegs.map((_,i)=>i).filter(i=>i!==fromIdx && i!==toIdx);
        const bufferIdx = auxIdxs[0];

        generateFSSequence(t, pegs, fromIdx, bufferIdx, out, 1);

        const reducedPegs = pegs.filter((_,i)=>i!==bufferIdx);
        const fromInReduced = reducedPegs.findIndex(p=>p===pegs[fromIdx]);
        const toInReduced = reducedPegs.findIndex(p=>p===pegs[toIdx]);
        generateFSSequence(n - t, reducedPegs, fromInReduced, toInReduced, out, 2);

        generateFSSequence(t, pegs, bufferIdx, toIdx, out, 3);
    }

    function snapshotPoles() {
        const state = {};
        Array.from(document.querySelectorAll('.pole')).forEach(pole => {
            const pid = pole.id;
            const poleEl = document.getElementById(pid);
            if (poleEl) {
                state[pid] = Array.from(poleEl.querySelectorAll('.disk')).map(d => +d.dataset.size);
            }
        });
        return state;
    }
    function findDiskPoleInState(state, size) {
        for (const pid of Object.keys(state)) {
            const arr = state[pid] || [];
            if (arr.includes(size)) return pid;
        }
        return null;
    }
    function applyMoveInState(state, from, to) {
        const fromArr = state[from];
        const toArr = state[to];
        if (!fromArr || !fromArr.length || !toArr) return false;
        const disk = fromArr[fromArr.length - 1];

        if (toArr.length && toArr[toArr.length - 1] < disk) return false;
        fromArr.pop();
        toArr.push(disk);
        return true;
    }
    function otherPole(p1, p2) {
        const set = ['a','b','c'];
        return set.find(x => x !== p1 && x !== p2);
    }
    function planToTargetFromState(state, k, target, seqOut) {
        if (k <= 0) return;
        const posK = findDiskPoleInState(state, k);
        if (!posK) return;
        if (posK === target) {
            planToTargetFromState(state, k - 1, target, seqOut);
            return;
        }
        const aux = otherPole(posK, target);
        planToTargetFromState(state, k - 1, aux, seqOut);
        seqOut.push([posK, target]);
        applyMoveInState(state, posK, target);
        planToTargetFromState(state, k - 1, target, seqOut);
    }
    function buildPlanFromCurrent(targetPoleId = 'c') {

        const poles = document.querySelectorAll('.pole');
        if (MODE !== 'play' || poles.length !== 3) return [];
        const state = snapshotPoles();
        const seqPlan = [];
        planToTargetFromState(state, n, targetPoleId, seqPlan);
        return seqPlan;
    }

    function isInitialClassicState(pegs, diskCount) {
        const state = snapshotPoles();
        const startId = (MODE==='sandbox' && sbOpt.startPole) ? sbOpt.startPole : pegs[0];
        const firstPole = startId;
        const otherPoles = pegs.filter(id => id !== firstPole);
        const a = state[firstPole] || [];
        const expect = Array.from({length: diskCount}, (_,i)=>i+1);
        if (a.length !== diskCount) return false;
        for (let i=0;i<diskCount;i++){ if (a[i] !== i+1) return false; }
        return otherPoles.every(pid => (state[pid]||[]).length === 0);
    }

    function startAutoSolver() {
        if (run) { stopAutoSolver(); }
        const polesEls = Array.from(document.querySelectorAll('.pole'));
        const pegs = polesEls.map(p=>p.id);
        if (MODE === 'sandbox' && sbOpt.rule === 'classic' && (pegs.length === 4 || pegs.length === 5)) {

            if (!isInitialClassicState(pegs, n)) {
                const est = optimalMovesFor(pegs.length, n);
                const t = FS_SPLIT.get(`${pegs.length}:${n}`) || 1;
                htE.innerHTML = `Auto-solve (Sandbox ${pegs.length} cột) hiện chỉ hỗ trợ từ trạng thái ban đầu.<br>` +
                                 `Ước lượng tối ưu (Frame–Stewart): <strong>${est}</strong> với t≈${t}.`;
                checkAllAchievements('fs_insight');
                return;
            }
            seq = [];
            optimalMovesFor(pegs.length, n);
            const startId = (sbStartInline && sbStartInline.value) ? sbStartInline.value : (sbOpt.startPole || pegs[0]);
            const startIdx = pegs.findIndex(id => id === startId);
            const targetId = sbTargetInline && sbTargetInline.value ? sbTargetInline.value : pegs[pegs.length - 1];
            const targetIdx = pegs.findIndex(id => id === targetId);
            generateFSSequence(n, pegs, startIdx >= 0 ? startIdx : 0, targetIdx >= 0 ? targetIdx : pegs.length - 1, seq);
        } else {

            seq = buildPlanFromCurrent('c');
        }
        ix = 0;
        run = true;
        if (!usedAuto) { usedAuto = true; checkAllAchievements('start_auto'); }

        if (!t0) {
            t0 = Date.now();
            // Clear old timer first to prevent leak
            if (tmr) clearInterval(tmr);
            tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
        }
        runDemoStep();
    }

    function runDemoStep() {
        if (ix >= seq.length || !run) { stopAutoSolver(); checkWinCondition(); return; }
        const p = seq[ix++];
        highlightPoles(p);
        setTimeout(() => {
            if (!run) return;
            const fromPole = document.getElementById(p[0]);
            const disk = fromPole ? [...fromPole.querySelectorAll('.disk')].pop() : null;
            if (!disk || !isValidMove(p[0], p[1], disk.dataset.size)) {
                stopAutoSolver();
                htE.textContent = 'Auto dừng: trạng thái đã thay đổi, nước đi tiếp theo không hợp lệ.';
                return;
            }
            performMove(p[0], p[1]);
            setTimeout(runDemoStep, +spdE.value);
        }, +spdE.value / 2);
    }

    function highlightTeachMove() { teach = seq[ix]; highlightPoles(teach); const fromPole = (teach[0].charCodeAt(0) - 96); const toPole = (teach[1].charCodeAt(0) - 96); htE.innerHTML = `<span class="teach-hint-label">Di chuyển từ Cọc</span> <strong class="teach-hint-pole">${fromPole}</strong> <span class="teach-hint-arrow">→</span> <strong class="teach-hint-pole">${toPole}</strong>`; }

    function highlightPoles(p) {
        document.querySelectorAll('.pole').forEach(pole => pole.classList.remove('from', 'to', 'hv'));
        const app = document.getElementById('app');
        app.classList.remove('fs-phase-1','fs-phase-2','fs-phase-3');
        if (p) {
            document.getElementById(p[0])?.classList.add('from', 'hv');
            document.getElementById(p[1])?.classList.add('to');
            const phase = p[2];
            if (phase) app.classList.add(`fs-phase-${phase}`);
        }
    }

    function stopAutoSolver() {
        run = false;
        teach = null;
        highlightPoles(null);
        htE.textContent = '—';
        if (MODE === 'play') {
            speedLabel.style.display = 'none';
        }
        autoBtn.textContent = 'Auto-solve';
    }

    function formatTime(s) { const mm = String(Math.floor(s / 60)).padStart(2, '0'); const ss = String(s % 60).padStart(2, '0'); return `${mm}:${ss}`; }

    function showErrorPopup() {
        playSound(errorSnd);
        errorPopup.style.display = 'flex';
        const box = errorPopup.querySelector('.popup-box');
        box.classList.remove('error-box');
        void box.offsetWidth;
        box.classList.add('error-box');
    }

    document.getElementById('reset').addEventListener('click', () => {
        stopAutoSolver();
        if (chActive) {
            clearInterval(chTimer);
            chActive = false;
            tE.textContent = '00:00';
        }
        buildStage();
        if (MODE === 'teach') { seq = []; generateHanoiSequence(n, 'a', 'c', 'b', seq); ix = 0; highlightTeachMove(); }
    });

    autoBtn.addEventListener('click', () => {
        if (MODE !== 'play') return;

        if (run) {
            stopAutoSolver();
        } else {
            startAutoSolver();
            speedLabel.style.display = 'block';
            autoBtn.textContent = 'Stop Solve';
        }
    });

    hintBtn.addEventListener('click', () => {
        const optimalMoves = Math.pow(2, n) - 1;
        let hintMessage = `Số bước tối thiểu cho ${n} đĩa là: <strong>${optimalMoves}</strong>.<br>`;
        if (MODE === 'play') {
            const plan = buildPlanFromCurrent('c');
            if (plan.length > 0) {
                const nextMove = plan[0];
                hintMessage += `Gợi ý nước đi tiếp theo (từ trạng thái hiện tại): <strong>Cọc ${(nextMove[0].charCodeAt(0) - 96)} → Cọc ${(nextMove[1].charCodeAt(0) - 96)}</strong>.`;
            } else {
                hintMessage += "Bạn đã ở trạng thái hoàn thành hoặc không tạo được gợi ý.";
            }
        }
        document.getElementById('hintTextPopup').innerHTML = hintMessage;
        hintPopup.style.display = 'flex';
    });

    document.getElementById('hintClose').addEventListener('click', () => { hintPopup.style.display = 'none'; });
    document.getElementById('errorConfirm').addEventListener('click', () => { errorPopup.style.display = 'none'; });

    nE.addEventListener('change', () => {
        const val = parseInt(nE.value);
        if (isNaN(val) || val < 1) {
            nE.value = n;
            return;
        }
        if (val > CONSTANTS.MAX_DISKS) {
            nE.value = CONSTANTS.MAX_DISKS;
            alert('Số đĩa tối đa là ' + CONSTANTS.MAX_DISKS + '!');
        }
        n = Math.min(CONSTANTS.MAX_DISKS, Math.max(CONSTANTS.MIN_DISKS, val));
        if (MODE === 'sandbox') {
            sbOpt.diskCount = n;
        }
        buildStage();
        if (MODE === 'teach') {
            seq = [];
            generateHanoiSequence(n, 'a', 'c', 'b', seq);
            ix = 0;
            highlightTeachMove();
        } else if (MODE === 'learn') {
            // Reset Learn mode with new disk count
            stopLearnRun();
            generateLearnEvents();
            learnNLabel.textContent = n;
            const totalSteps = Math.pow(2, n) - 1;
            if (learnComplexity) {
                learnComplexity.innerHTML = `O(2<sup>n</sup>) ≈ ${totalSteps} moves`;
            }
        }
    });

    thE.addEventListener('change', () => { if (thE.value !== 'classic') themeChg = true; checkAllAchievements(); applyTheme(); buildStage(); });
    sndE.addEventListener('change', () => { if (sndE.checked) playBGM(); else pauseBGM(); });
    spdE.addEventListener('change', () => { if (run) { stopAutoSolver(); startAutoSolver(); autoBtn.textContent = 'Stop Solve'; speedLabel.style.display = 'block'; } });

    function updateUndoButton() { undoBtn.disabled = mvHist.length === 0; }
    undoBtn.addEventListener('click', () => {
        if (mvHist.length > 0) {
            const lastMove = mvHist.pop();
            const fromPole = document.getElementById(lastMove.to);
            const toPole = document.getElementById(lastMove.from);
            const disk = [...fromPole.querySelectorAll('.disk')].pop();
            if (disk) {
                toPole.appendChild(disk);
                moves--;
                undoCount++;
                checkAllAchievements();
                mvE.textContent = moves;
                playSound(pickupSnd);
                updateTopDisks();
                updateProgressBar();
                saveGameState();
                
                // Track undo
                if (typeof window.GameEnhancements !== 'undefined') window.GameEnhancements.updateAchievementProgress('undoer', undoCount, 15);
            }
            updateUndoButton();
        }
    });

    function clearHeldDisk() { if (heldDisk) { heldDisk.diskElement.classList.remove('held'); heldDisk = null; } }
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        const poleCount = document.querySelectorAll('.pole').length;
        const keyNum = parseInt(e.key);
        if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= poleCount) {
            const poleId = String.fromCharCode(96 + keyNum);
            const poleEl = document.getElementById(poleId);
            if (!poleEl) return;
            if (!heldDisk) {
                const topDisk = [...poleEl.querySelectorAll('.disk')].pop();
                if (topDisk) { heldDisk = { diskElement: topDisk, fromPole: poleId }; topDisk.classList.add('held'); playSound(pickupSnd); }
            } else {
                if (isValidMove(heldDisk.fromPole, poleId, heldDisk.diskElement.dataset.size)) {
                    if (heldDisk.fromPole !== poleId) executeMove(heldDisk.fromPole, poleId);
                    clearHeldDisk();
                } else {
                    showErrorPopup();
                    clearHeldDisk();
                }
            }
        } else if (e.key === 'Escape') {
            clearHeldDisk();
        }
    });

    const modeOverlay = document.getElementById('modeSelect');
    const allModeCards = Array.from(document.querySelectorAll('.mode-card'));
    const modeStartBtn = document.getElementById('modeStart');
    const changeModeBtn = document.getElementById('changeMode');
    const currentModeDisplay = document.getElementById('currentModeDisplay');
    let chosenMode = 'play';

    allModeCards.forEach(card => card.addEventListener('click', () => { allModeCards.forEach(c => c.classList.remove('selected')); card.classList.add('selected'); chosenMode = card.id.replace('mode-', ''); }));
    changeModeBtn.addEventListener('click', () => {
        stopAutoSolver(); clearInterval(tmr); t0 = null; clearInterval(chTimer); chActive = false;
        document.getElementById('learnPanel').style.display = 'none';

        document.querySelectorAll('.pole').forEach(p => p.classList.remove('from', 'to'));
        tE.textContent = '00:00'; mvE.textContent = '0';
        modeOverlay.style.display = 'flex';
    });

    modeStartBtn.addEventListener('click', () => {
        if (chosenMode === 'challenge') {
            modeOverlay.style.display = 'none';
            challengeDifficultyPopup.style.display = 'flex';
            return;
        }
        if (chosenMode === 'sandbox') {
            modeOverlay.style.display = 'none';
            sandboxSetupPopup.style.display = 'flex';
            updateSandboxRuleInfo(sandboxRuleSelect.value);
            return;
        }
        MODE = chosenMode;
        modeOverlay.style.display = 'none';
        applyModeChange();
    });

    function applyModeChange() {
        currentModeDisplay.textContent = MODE.charAt(0).toUpperCase() + MODE.slice(1);
        const isSandbox = MODE === 'sandbox';

        document.getElementById('best-score-display').style.display = isSandbox ? 'none' : '';
        document.getElementById('sandbox-status').style.display = isSandbox ? '' : 'none';
        document.querySelector('.progress').parentElement.style.visibility = isSandbox ? 'hidden' : 'visible';
        const k = document.querySelectorAll('.pole').length || sbOpt.poleCount;
        const sandboxAutoAllowed = isSandbox && sbOpt.rule === 'classic' && (sbOpt.poleCount === 4 || sbOpt.poleCount === 5);
        autoBtn.disabled = (MODE !== 'play' && !sandboxAutoAllowed) || (isSandbox && !sandboxAutoAllowed);
        hintBtn.disabled = isSandbox || run || MODE === 'learn' || MODE === 'teach' || MODE === 'challenge';

        nE.parentElement.style.display = '';
        nE.disabled = (MODE === 'challenge');
        speedLabel.style.display = (MODE === 'learn') ? 'block' : 'none';

        buildStage();
        stopAutoSolver();

        if (isSandbox) {
            document.getElementById('sandbox-status').textContent = `${sbOpt.poleCount} Cột, ${sbOpt.diskCount} Đĩa`;

            if (sbInline) {
                sbInline.style.display = 'flex';

                const poles = Array.from(document.querySelectorAll('.pole')).map(p => p.id);
                const labels = poles.map((_, i) => String.fromCharCode(65 + i));
                sbStartInline.innerHTML = '';
                sbTargetInline.innerHTML = '';
                labels.forEach((lbl, idx) => {
                    const optS = document.createElement('option');
                    optS.value = poles[idx];
                    optS.textContent = lbl;
                    sbStartInline.appendChild(optS);
                    const opt = document.createElement('option');
                    opt.value = poles[idx];
                    opt.textContent = lbl;
                    sbTargetInline.appendChild(opt);
                });

                sbStartInline.value = sbOpt.startPole || poles[0];
                sbTargetInline.value = poles[poles.length - 1];
                if (sbRuleInline) sbRuleInline.value = sbOpt.rule || 'classic';
            }

            nE.value = sbOpt.diskCount;
        } else {
            if (sbInline) sbInline.style.display = 'none';
        }

        if (MODE === 'learn') { checkAllAchievements('enter_learn'); startLearnMode(); document.getElementById('learnPanel').style.display = 'block'; }
        else if (MODE === 'teach') { seq = []; generateHanoiSequence(n, 'a', 'c', 'b', seq); ix = 0; highlightTeachMove(); }
    }

    function randomChallengeDisks(min=3,max=8){return Math.floor(Math.random()*(max-min+1))+min}
    ['Easy', 'Medium', 'Hard'].forEach(diff => {
        document.getElementById(`difficulty${diff}`).addEventListener('click', () => {
            challengeDifficultyPopup.style.display = 'none';
            MODE = 'challenge';

            n = randomChallengeDisks();
            nE.value = n;
            applyModeChange();
            startChallengeFor(n, diff.toLowerCase());
        });
    });

    function updateFsInfo() {
        if (!sbFsInfo) return;
        const k = (MODE === 'sandbox') ? sbOpt.poleCount : 3;
        const show = (MODE === 'sandbox' && sbOpt.rule === 'classic' && (k === 4 || k === 5));
        if (!show) { sbFsInfo.style.display = 'none'; return; }
        const opt = optimalMovesFor(k, n);
        const t = FS_SPLIT.get(`${k}:${n}`) || 1;
        sbFsInfo.style.display = '';
        sbFsInfo.textContent = `FS: k=${k}, n=${n}, t≈${t}, opt≈${opt}`;
    }

    if (sbStartInline) {
        sbStartInline.addEventListener('change', () => { sbOpt.startPole = sbStartInline.value; buildStage(); });
    }
    if (sbTargetInline) {
        sbTargetInline.addEventListener('change', () => {  });
    }
    if (sbRuleInline) {
        sbRuleInline.addEventListener('change', () => { sbOpt.rule = sbRuleInline.value; buildStage(); });
    }

    const sandboxRuleDescs = {
        classic: 'Tự do di chuyển giữa các cột. Đĩa nhỏ trên đĩa lớn.',
        cyclic: 'Chỉ đi theo chiều kim đồng hồ. Không nhảy cột!',
        adjacent: 'Chỉ đi sang cột kề. Đầu-cuối KHÔNG kề nhau.'
    };
    
    const sandboxRuleExamples = {
        classic: '<strong>VD:</strong> 1→2,3,4. Tự do!',
        cyclic: '<strong>VD:</strong> 1→2→3→4→1 (vòng)',
        adjacent: '<strong>VD:</strong> 1↔2, 2↔1,3, 3↔2,4'
    };
    
    const sandboxRuleExampleEl = document.getElementById('sandboxRuleExample');
    const sandboxSummaryEl = document.getElementById('sandboxSummary');
    
    function updateSandboxSummary() {
        const disks = sandboxDisksSlider.value;
        const poles = sandboxPolesSlider.value;
        const rule = sandboxRuleSelect.value;
        const start = sandboxStartPosSelect.value;
        const target = sandboxTargetSelect.value;
        
        const ruleText = rule === 'classic' ? '✨ Classic' : rule === 'cyclic' ? '🔄 Cyclic' : '🔗 Adjacent';
        const startText = start === 'classic' ? '🔵 Cột 1' : start === 'spread' ? '🌊 Phân tán' : '🔴 Cột cuối';
        const targetText = target === 'any_other' ? '✅ Bất kỳ cột nào' : target === 'last_pole' ? '🎪 Cột cuối' : '🎯 Cột cụ thể';
        
        sandboxSummaryEl.innerHTML = `<strong>${disks} đĩa</strong> trên <strong>${poles} cột</strong> | Luật: <strong>${ruleText}</strong> | Start: <strong>${startText}</strong> → Target: <strong>${targetText}</strong>`;
    }
    
    function updateSandboxRuleInfo(rule) {
        sandboxRuleDesc.textContent = sandboxRuleDescs[rule];
        sandboxRuleExampleEl.innerHTML = sandboxRuleExamples[rule];
        updateSandboxSummary();
    }
    
    sandboxDisksSlider.addEventListener('input', (e) => { sandboxDisksValue.textContent = e.target.value; updateSandboxSummary(); });
    sandboxPolesSlider.addEventListener('input', (e) => { sandboxPolesValue.textContent = e.target.value; updateSandboxSummary(); });
    sandboxRuleSelect.addEventListener('change', (e) => { updateSandboxRuleInfo(e.target.value); });
    sandboxStartPosSelect.addEventListener('change', updateSandboxSummary);
    sandboxTargetSelect.addEventListener('change', updateSandboxSummary);

    sandboxStartBtn.addEventListener('click', () => {
        sbOpt.diskCount = parseInt(sandboxDisksSlider.value);
        sbOpt.poleCount = parseInt(sandboxPolesSlider.value);
        sbOpt.rule = sandboxRuleSelect.value;
        sbOpt.startPos = sandboxStartPosSelect.value;
        sbOpt.target = sandboxTargetSelect.value;

        MODE = 'sandbox';
        sandboxSetupPopup.style.display = 'none';
        applyModeChange();
    });

    // Sandbox presets
    const applyPreset = (poles, disks, rule, start, target) => {
        sandboxPolesSlider.value = poles;
        sandboxPolesValue.textContent = poles;
        sandboxDisksSlider.value = disks;
        sandboxDisksValue.textContent = disks;
        sandboxRuleSelect.value = rule;
        updateSandboxRuleInfo(rule);
        sandboxStartPosSelect.value = start;
        sandboxTargetSelect.value = target;
        updateSandboxSummary();
    };
    
    const preset4col = document.getElementById('preset4col');
    const preset5col = document.getElementById('preset5col');
    const presetHard = document.getElementById('presetHard');
    const presetExtreme = document.getElementById('presetExtreme');
    const presetAdjacent = document.getElementById('presetAdjacent');
    const presetSpread = document.getElementById('presetSpread');
    
    if (preset4col) preset4col.addEventListener('click', () => applyPreset(4, 5, 'classic', 'classic', 'any_other'));
    if (preset5col) preset5col.addEventListener('click', () => applyPreset(5, 6, 'classic', 'classic', 'any_other'));
    if (presetHard) presetHard.addEventListener('click', () => applyPreset(6, 7, 'cyclic', 'classic', 'any_other'));
    if (presetExtreme) presetExtreme.addEventListener('click', () => applyPreset(8, 12, 'classic', 'classic', 'any_other'));
    if (presetAdjacent) presetAdjacent.addEventListener('click', () => applyPreset(5, 6, 'adjacent', 'classic', 'any_other'));
    if (presetSpread) presetSpread.addEventListener('click', () => applyPreset(6, 8, 'classic', 'spread', 'any_other'));

    titleDisplayContainer.addEventListener('click', () => { renderAchievements(); achievementsPopup.style.display = 'flex'; });
    document.getElementById('achievementsClose').addEventListener('click', () => { achievementsPopup.style.display = 'none'; });

    const aboutBtn = document.getElementById('aboutBtn');
    const rulesBtn = document.getElementById('rulesBtn');
    const aboutPopup = document.getElementById('aboutPopup');
    const rulesPopup = document.getElementById('rulesPopup');
    
    if (aboutBtn && aboutPopup) {
        aboutBtn.addEventListener('click', () => { aboutPopup.style.display = 'flex'; });
    }
    if (rulesBtn && rulesPopup) {
        rulesBtn.addEventListener('click', () => { rulesPopup.style.display = 'flex'; });
    }

    settingsBtn.addEventListener('click', () => { 
        settingsPopup.style.display = 'flex';
        settingsPopup.classList.remove('collapsed');
    });
    
    if(settingsCloseX) {
        settingsCloseX.addEventListener('click', () => { settingsPopup.style.display = 'none'; });
    }
    
    if(settingsMinimizeBtn) {
        settingsMinimizeBtn.addEventListener('click', () => {
            settingsPopup.classList.toggle('collapsed');
            settingsMinimizeBtn.textContent = settingsPopup.classList.contains('collapsed') ? '+' : '−';
        });
    }
    
    makeDraggable(settingsPopup, settingsHeader, ['.panel-btn', 'button', 'input', 'select']);

    Object.entries(audEls).forEach(([name, item]) => {
        item.input.addEventListener('change', (e) => handleSoundUpload(e, item.key));
    });

    const bgImageUpload = document.getElementById('bgImageUpload');
    const bgImageStatus = document.getElementById('bgImageStatus');
    const bgOpacitySlider = document.getElementById('bgOpacity');
    const bgOpacityValue = document.getElementById('bgOpacityValue');

    function handleBackgroundUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Stricter size limit for background images
        const MAX_BG_SIZE = CONSTANTS.MAX_BG_SIZE_MB * 1024 * 1024;
        if (file.size > MAX_BG_SIZE) {
            alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 2MB.\n\nKích thước hiện tại: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result;
            
            // Check localStorage capacity
            try {
                const currentSize = new Blob([JSON.stringify(localStorage)]).size;
                const newDataSize = new Blob([base64Data]).size;
                const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
                const availableSpace = STORAGE_LIMIT - currentSize;
                
                if (newDataSize > availableSpace) {
                    alert('Không đủ bộ nhớ! Cần ' + (newDataSize / 1024).toFixed(0) + 'KB nhưng chỉ còn ' + (availableSpace / 1024).toFixed(0) + 'KB.\n\nVui lòng xóa bộ nhớ đệm.');
                    e.target.value = '';
                    return;
                }
                
                localStorage.setItem('customBackground', base64Data);
                applyCustomBackground();
                bgImageStatus.textContent = "Đã tùy chỉnh";
                bgImageStatus.style.color = 'var(--accent)';
            } catch (err) {
                console.error('Background upload error:', err);
                alert('Lỗi: Không thể lưu ảnh nền.\n\n' + err.message + '\n\nThử xóa bộ nhớ đệm trong Cài đặt.');
                e.target.value = '';
            }
        };
        reader.readAsDataURL(file);
    }

    function applyCustomBackground() {
        const customBg = localStorage.getItem('customBackground');
        const opacity = localStorage.getItem('bgOpacity') || '100';
        const bodyEl = document.body;

        let bgOverlay = document.getElementById('customBgOverlay');
        if (!bgOverlay) {
            bgOverlay = document.createElement('div');
            bgOverlay.id = 'customBgOverlay';
            bgOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;transition:opacity 0.3s ease';
            document.body.appendChild(bgOverlay);
        }

        if (customBg) {
            bgOverlay.style.backgroundImage = `url('${customBg}')`;
            bgOverlay.style.backgroundSize = 'cover';
            bgOverlay.style.backgroundPosition = 'center';
            bgOverlay.style.backgroundAttachment = 'fixed';
            bgOverlay.style.backgroundRepeat = 'no-repeat';
            bgOverlay.style.opacity = opacity / 100;
            if (bgImageStatus) {
                bgImageStatus.textContent = "Đã tùy chỉnh";
                bgImageStatus.style.color = 'var(--accent)';
            }
        } else {
            bgOverlay.style.backgroundImage = '';
            bgOverlay.style.opacity = '0';
            if (bgImageStatus) {
                bgImageStatus.textContent = "Mặc định";
                bgImageStatus.style.color = 'var(--muted)';
            }
        }

        if (bgOpacitySlider) {
            bgOpacitySlider.value = opacity;
            if (bgOpacityValue) bgOpacityValue.textContent = opacity + '%';
        }
    }

    function resetCustomBackground() {
        localStorage.removeItem('customBackground');
        localStorage.removeItem('bgOpacity');
        applyCustomBackground();
    }

    if (bgImageUpload) {
        bgImageUpload.addEventListener('change', handleBackgroundUpload);
    }

    if (bgOpacitySlider) {
        bgOpacitySlider.addEventListener('input', (e) => {
            const val = e.target.value;
            localStorage.setItem('bgOpacity', val);
            const bgOverlay = document.getElementById('customBgOverlay');
            if (bgOverlay) bgOverlay.style.opacity = val / 100;
            if (bgOpacityValue) bgOpacityValue.textContent = val + '%';
        });
    }

    settingsResetBtn.addEventListener('click', () => {
        if(confirm('Bạn có chắc muốn khôi phục tất cả âm thanh và ảnh nền về mặc định không?')) {
            resetCustomSounds();
            resetCustomBackground();
        }
    });

    const clearCacheBtn = document.getElementById('clearCache');
    const clearAllDataBtn = document.getElementById('clearAllData');
    
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if(confirm('Xóa bộ nhớ đệm? (Custom audio, background sẽ bị xóa)')) {
                localStorage.removeItem('customBGM');
                localStorage.removeItem('customPickup');
                localStorage.removeItem('customDrop');
                localStorage.removeItem('customWin');
                localStorage.removeItem('customBackground');
                localStorage.removeItem('bgOpacity');
                resetCustomSounds();
                resetCustomBackground();
                alert('✅ Đã xóa bộ nhớ đệm!');
            }
        });
    }
    
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', () => {
            if(confirm('⚠️ CẢNH BÁO: Xóa TOÀN BỘ dữ liệu?\n\nSẽ xóa:\n- Achievements\n- Best scores  \n- Settings\n- Custom audio/background\n- Game state\n\nHành động này KHÔNG THỂ HOÀN TÁC!')) {
                if(confirm('Bạn THỰC SỰ chắc chắn? Nhấn OK để xóa mọi thứ.')) {
                    localStorage.clear();
                    alert('🗑️ Đã xóa toàn bộ dữ liệu. Trang sẽ reload...');
                    location.reload();
                }
            }
        });
    }

    applyCustomBackground();

    function currentStateKey() {
        const mode = MODE;
        const k = (mode === 'sandbox') ? sbOpt.poleCount : 3;
        const rule = (mode === 'sandbox') ? sbOpt.rule : 'classic';
        const nKey = n;
        const start = (mode === 'sandbox') ? (sbOpt.startPole || 'a') : 'a';
        const target = (mode === 'sandbox') ? (document.getElementById('sbTargetInline')?.value || 'c') : 'c';
        return `hanoi_lb_v1|mode=${mode}|k=${k}|rule=${rule}|n=${nKey}|start=${start}|target=${target}`;
    }
    function loadLeaderboard(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e){ return []; } }
    function saveLeaderboard(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
    function saveLeaderboardOnWin() {
        const key = currentStateKey();
        const arr = loadLeaderboard(key);
        const tSeconds = Math.floor((Date.now() - (t0||Date.now())) / 1000) || 0;
        arr.push({ moves, time: tSeconds, ts: Date.now() });
        arr.sort((a,b) => (a.moves - b.moves) || (a.time - b.time) || (a.ts - b.ts));
        saveLeaderboard(key, arr.slice(0,10));
    }

    document.addEventListener('DOMContentLoaded', () => {
        const greetingPopup = document.getElementById('greetingPopup');
        try { if (bgmEl) { bgmEl.setAttribute('playsinline',''); bgmEl.preload = 'auto'; } } catch(_) {}

        const hasSeenGreeting = localStorage.getItem('hanoi_seen_greeting') === 'true';

        const tutorialPrompt = document.getElementById('tutorialPrompt');
        const tutorialYes = document.getElementById('tutorialYes');
        const tutorialNo = document.getElementById('tutorialNo');
        
        const goToTutorialPrompt = () => {
            if (greetingPopup) greetingPopup.style.display = 'none';
            if (tutorialPrompt) tutorialPrompt.style.display = 'flex';
        };
        
        const goToModeSelect = () => {
            if (tutorialPrompt) tutorialPrompt.style.display = 'none';
            if (greetingPopup) greetingPopup.style.display = 'none';
            if (modeOverlay) modeOverlay.style.display = 'flex';
            else { MODE = 'play'; applyModeChange(); }
            localStorage.setItem('hanoi_seen_greeting', 'true');
        };
        
        const showRulesAndGoToMode = () => {
            if (tutorialPrompt) tutorialPrompt.style.display = 'none';
            const rulesPopup = document.getElementById('rulesPopup');
            if (rulesPopup) {
                rulesPopup.style.display = 'flex';
                setTimeout(() => {
                    const closeBtn = rulesPopup.querySelector('button');
                    if (closeBtn) {
                        const onClose = () => {
                            closeBtn.removeEventListener('click', onClose);
                            goToModeSelect();
                        };
                        closeBtn.addEventListener('click', onClose);
                    }
                }, 100);
            } else {
                goToModeSelect();
            }
        };

        if (hasSeenGreeting) {
            if (greetingPopup) greetingPopup.style.display = 'none';

            const savedGameState = localStorage.getItem('hanoi_game_state_v3');
            if (savedGameState) {
                try {
                    const state = JSON.parse(savedGameState);
                    if (state.sound !== false) {
                        sndE.checked = true;

                        setTimeout(() => playBGM(), 100);
                    }
                } catch(e) {
                    console.error('Error parsing saved game state for audio:', e);
                }
            } else {

                if (sndE.checked) {
                    setTimeout(() => playBGM(), 100);
                }
            }

            if (savedGameState) {

            } else {

                if (modeOverlay) modeOverlay.style.display = 'flex';
            }
        }

        const musicYes = document.getElementById('musicYes');
        const musicNo = document.getElementById('musicNo');
        const loserClose = document.getElementById('loserClose');

        console.log('Button refs:', {musicYes: !!musicYes, musicNo: !!musicNo});

        if (musicYes) musicYes.addEventListener('click', () => {
            try {
                sndE.checked = true;
                playBGM();
                goToTutorialPrompt();
            } catch(e) {
                goToTutorialPrompt();
            }
        });
        if (musicNo) musicNo.addEventListener('click', () => {
            try {
                sndE.checked = false;
                goToTutorialPrompt();
            } catch(e) {
                goToTutorialPrompt();
            }
        });
        if (tutorialYes) tutorialYes.addEventListener('click', () => {
            goToModeSelect();
        });
        if (tutorialNo) tutorialNo.addEventListener('click', () => {
            showRulesAndGoToMode();
        });
        if (loserClose) loserClose.addEventListener('click', () => { loserPopup.style.display = 'none'; });

        const challengeWinEasyClose = document.getElementById('challengeWinEasyClose');
        const challengeWinMediumClose = document.getElementById('challengeWinMediumClose');
        const challengeWinHardClose = document.getElementById('challengeWinHardClose');
        if (challengeWinEasyClose) challengeWinEasyClose.addEventListener('click', () => { document.getElementById('challengeWinEasy').style.display = 'none'; });
        if (challengeWinMediumClose) challengeWinMediumClose.addEventListener('click', () => { document.getElementById('challengeWinMedium').style.display = 'none'; });
        if (challengeWinHardClose) challengeWinHardClose.addEventListener('click', () => { document.getElementById('challengeWinHard').style.display = 'none'; });

        if (sandboxRuleDesc && sandboxRuleSelect) {
            updateSandboxRuleInfo(sandboxRuleSelect.value);
        }

        loadAchievements();
        loadSandboxConfigs();
        updateTitleDisplay();
        loadCustomSounds();

        try {
            if (!loadGameState()) buildStage();
        } catch(e) {
            console.error('Bootstrap error:', e);
            buildStage();
        }

        const analysisBtn = document.getElementById('analysisBtn');
        const analysisPopup = document.getElementById('analysisPopup');
        const analysisClose = document.getElementById('analysisClose');
        function renderLeaderboard() {
            const listEl = document.getElementById('leaderboardList');
            if (!listEl) return;
            const key = currentStateKey();
            const data = loadLeaderboard(key);
            const header = `<div style="display:flex;gap:8px;font-weight:800;color:var(--muted)"><span style='width:28px'>#</span><span style='width:80px'>Bước</span><span style='width:80px'>Thời gian</span><span style='flex:1'>Ngày</span></div>`;
            const rows = data.map((e,i)=>`<div style='display:flex;gap:8px;padding:6px 0;border-bottom:1px dashed rgba(128,128,160,0.2)'><span style='width:28px'>${i+1}</span><span style='width:80px;font-weight:800'>${e.moves}</span><span style='width:80px'>${formatTime(e.time)}</span><span style='flex:1;color:var(--muted)'>${new Date(e.ts).toLocaleString()}</span></div>`).join('');
            listEl.innerHTML = header + (rows || `<div style='margin-top:8px;color:var(--muted)'>Chưa có dữ liệu cho trạng thái này. Hãy chơi và chiến thắng để lên bảng!</div>`);
        }
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => { checkAllAchievements('open_analysis'); renderLeaderboard(); analysisPopup.style.display = 'flex'; });
        }
        if (analysisClose) {
            analysisClose.addEventListener('click', () => { analysisPopup.style.display = 'none'; });
        }
    });

    const learnPanel = document.getElementById('learnPanel');
    const learnHeader = document.getElementById('learnHeader');
    const learnCollapseBtn = document.getElementById('learnCollapseBtn');
    const learnCloseBtn = document.getElementById('learnCloseBtn');
    const learnNLabel = document.getElementById('learnN');
    const learnPrev = document.getElementById('learnPrev');
    const learnPlay = document.getElementById('learnPlay');
    const learnPause = document.getElementById('learnPause');
    const learnNext = document.getElementById('learnNext');
    const learnSpeed = document.getElementById('learnSpeed');
    const stackArea = document.getElementById('stackArea');
    const learnExplain = document.getElementById('learnExplain');
    const pseudoCodeLines = document.querySelectorAll('#pseudoCodeArea .code-line');
    const learnProgressBar = document.getElementById('learnProgressBar');
    const learnStepCounter = document.getElementById('learnStepCounter');
    const learnComplexity = document.getElementById('learnComplexity');

    let learnEvents = [], learnIdx = 0, learnTimer = null, learnRunning = false, learnInterval = 700;

    function buildLearnTrace(k, f, t, a, depth, id, events) {
        if (k <= 0) return;
        const uid = id || (Math.random().toString(36).slice(2));
        events.push({ type: 'call', k, from: f, to: t, aux: a, depth, uid, target: 'pre' });
        buildLearnTrace(k - 1, f, a, t, depth + 1, uid + 'L', events);

        events.push({ type: 'move', k, from: f, to: t, depth, uid });

        events.push({ type: 'call', k, from: f, to: t, aux: a, depth, uid, target: 'post' });
        buildLearnTrace(k - 1, a, t, f, depth + 1, uid + 'R', events);

        events.push({ type: 'ret', k, from: f, to: t, depth, uid });
    }

    function generateLearnEvents() { learnEvents = []; const K = n; buildLearnTrace(K, 'a', 'c', 'b', 0, null, learnEvents); learnIdx = 0; renderLearnTrace(); }

    function renderLearnTrace() {
        stackArea.innerHTML = '';
        const active = learnEvents[learnIdx];
        const map = [];

        const progress = learnEvents.length > 0 ? ((learnIdx + 1) / learnEvents.length) * 100 : 0;
        if (learnProgressBar) learnProgressBar.style.width = `${progress}%`;
        if (learnStepCounter) {
            if (learnEvents.length === 0) {
                learnStepCounter.textContent = 'Không có bước nào';
            } else {
                learnStepCounter.textContent = `Bước ${learnIdx + 1}/${learnEvents.length}`;
            }
        }

        for (let i = 0; i <= learnIdx && i < learnEvents.length; i++) {
            const e = learnEvents[i];
            if (e.type === 'call') {
                map.push(e);
            } else if (e.type === 'ret') {
                for (let j = map.length - 1; j >= 0; j--) {
                    if (map[j].uid === e.uid) {
                        map.splice(j, 1);
                        break;
                    }
                }
            }
        }

        const depthColors = [
            '#2b8cff', '#28a745', '#f39c12', '#e74c3c', '#9b59b6',
            '#1abc9c', '#e91e63', '#ff5722', '#607d8b', '#795548'
        ];

        map.forEach(e => {
            const node = document.createElement('div');
            node.className = 'stack-node';
            node.style.paddingLeft = (10 + e.depth * 12) + 'px';
            node.style.borderLeftColor = depthColors[e.depth % depthColors.length];
            node.style.background = `linear-gradient(90deg, ${depthColors[e.depth % depthColors.length]}08, ${depthColors[e.depth % depthColors.length]}02)`;

            const depthBadge = document.createElement('span');
            depthBadge.style.cssText = `display:inline-block;background:${depthColors[e.depth % depthColors.length]};color:white;padding:2px 6px;border-radius:4px;font-size:10px;margin-right:6px;font-weight:900`;
            depthBadge.textContent = `L${e.depth}`;

            node.appendChild(depthBadge);
            node.appendChild(document.createTextNode(`Hanoi(${e.k}, ${e.from.toUpperCase()}, ${e.to.toUpperCase()}, ${e.aux.toUpperCase()})`));
            stackArea.appendChild(node);
        });

        document.querySelectorAll('.pole').forEach(p => {
            p.classList.remove('from', 'to');
        });

        pseudoCodeLines.forEach(line => line.classList.remove('highlight'));
        if (active) {
            if (active.type === 'move') {
                learnExplain.innerHTML = `<strong>⚡ Thực thi:</strong> Di chuyển đĩa <strong style="color:var(--accent)">${active.k}</strong> từ <strong>${active.from.toUpperCase()}</strong> → <strong>${active.to.toUpperCase()}</strong><br><span style="font-size:12px;color:var(--muted)">Đây là bước cơ bản - di chuyển 1 đĩa trực tiếp</span>`;
                pseudoCodeLines[3].classList.add('highlight');

                const fromPole = document.getElementById(active.from);
                const toPole = document.getElementById(active.to);
                if (fromPole) fromPole.classList.add('from');
                if (toPole) toPole.classList.add('to');
            } else if (active.type === 'call') {
                if (active.target === 'pre') {
                    learnExplain.innerHTML = `<strong>🔄 Gọi đệ quy PRE:</strong> Hanoi(${active.k - 1}, ${active.from.toUpperCase()}, ${active.aux.toUpperCase()}, ${active.to.toUpperCase()})<br><span style="font-size:12px;color:var(--muted)">Di chuyển ${active.k - 1} đĩa nhỏ lên cọc phụ để mở đường cho đĩa ${active.k}</span>`;
                    pseudoCodeLines[2].classList.add('highlight');
                } else if (active.target === 'post') {
                    learnExplain.innerHTML = `<strong>🔄 Gọi đệ quy POST:</strong> Hanoi(${active.k - 1}, ${active.aux.toUpperCase()}, ${active.to.toUpperCase()}, ${active.from.toUpperCase()})<br><span style="font-size:12px;color:var(--muted)">Di chuyển ${active.k - 1} đĩa nhỏ từ cọc phụ lên đích cuối cùng</span>`;
                    pseudoCodeLines[4].classList.add('highlight');
                }
            } else if (active.type === 'ret') {
                learnExplain.innerHTML = `<strong>✅ Hoàn thành:</strong> Hanoi(${active.k}, ${active.from.toUpperCase()}, ${active.to.toUpperCase()})<br><span style="font-size:12px;color:var(--muted)">Đã giải quyết xong bài toán con này, quay về lời gọi cha</span>`;
                pseudoCodeLines[5].classList.add('highlight');
            }
        }
    }

    function stepLearn(dir) {
        const prevIdx = learnIdx;
        if (dir === -1) learnIdx = Math.max(0, learnIdx - 1);
        else learnIdx = Math.min(learnEvents.length - 1, learnIdx + 1);

        const e = learnEvents[learnIdx];
        if(e.type === 'move') {
             if(dir === -1) {
                 const prevE = learnEvents[prevIdx];
                 if (prevE.type === 'move') performMove(prevE.to, prevE.from);
             } else {
                 performMove(e.from, e.to);
             }
         }
         else if (dir === -1 && e.type !== 'move') {
             const prevE = learnEvents[prevIdx];
             if (prevE.type === 'move') {
                 performMove(prevE.to, prevE.from);
             }
         }

        renderLearnTrace();
    }

    function startLearnRun() { 
        if (learnRunning) return; 
        learnRunning = true; 
        learnPlay.style.display = 'none'; 
        learnPause.style.display = 'inline-block'; 
        // Clear old timer first to prevent leak
        if (learnTimer) clearInterval(learnTimer);
        learnTimer = setInterval(() => { 
            if (learnIdx < learnEvents.length - 1) { 
                stepLearn(1); 
            } else { 
                stopLearnRun(); 
                checkWinCondition(); 
            } 
        }, learnInterval); 
    }
    function stopLearnRun() { 
        learnRunning = false; 
        if (learnTimer) clearInterval(learnTimer); 
        learnTimer = null; 
        learnPlay.style.display = 'inline-block'; 
        learnPause.style.display = 'none'; 
    }
    function startLearnMode() {
        stopLearnRun();
        buildStage();
        generateLearnEvents();
        learnNLabel.textContent = n;

        const totalSteps = Math.pow(2, n) - 1;
        if (learnComplexity) {
            learnComplexity.innerHTML = `O(2<sup>n</sup>) ≈ ${totalSteps} moves`;
        }
    }

    learnPrev.addEventListener('click', () => { stopLearnRun(); stepLearn(-1); });
    learnPlay.addEventListener('click', startLearnRun);
    learnPause.addEventListener('click', stopLearnRun);
    learnNext.addEventListener('click', () => { stopLearnRun(); stepLearn(1); });
    learnSpeed.addEventListener('change', (e) => {
        learnInterval = +e.target.value;
        spdE.value = +e.target.value;
        if (learnRunning) { stopLearnRun(); startLearnRun(); }
    });
    spdE.addEventListener('change', (e) => {
        learnInterval = +e.target.value;
        learnSpeed.value = +e.target.value;
    });

    let dragState = {active:false,el:null,offX:0,offY:0};

    function makeDraggable(panel,header,ignoreSelectors=[]) {
        if(!panel||!header)return;
        const startDrag=(x,y)=>{
            dragState.active=true;
            dragState.el=panel;
            panel.style.transform='none';
            const rect=panel.getBoundingClientRect();
            panel.style.left=rect.left+'px';
            panel.style.top=rect.top+'px';
            panel.style.right='auto';
            panel.style.bottom='auto';
            dragState.offX=x-rect.left;
            dragState.offY=y-rect.top;
            panel.classList.add('dragging');
        };
        header.addEventListener('mousedown',(e)=>{
            if(ignoreSelectors.some(s=>e.target.closest(s)))return;
            startDrag(e.clientX,e.clientY);
            e.preventDefault();
        });
        header.addEventListener('touchstart',(e)=>{
            if(ignoreSelectors.some(s=>e.target.closest(s)))return;
            const t=e.touches[0];
            startDrag(t.clientX,t.clientY);
        });
    }

    document.addEventListener('mousemove',(e)=>{
        if(!dragState.active||!dragState.el)return;
        let x=e.clientX-dragState.offX;
        let y=e.clientY-dragState.offY;
        x=Math.max(0,Math.min(window.innerWidth-dragState.el.offsetWidth,x));
        y=Math.max(0,Math.min(window.innerHeight-dragState.el.offsetHeight,y));
        dragState.el.style.left=x+'px';
        dragState.el.style.top=y+'px';
        dragState.el.style.right='auto';
        dragState.el.style.bottom='auto';
    });

    document.addEventListener('touchmove',(e)=>{
        if(!dragState.active||!dragState.el)return;
        const t=e.touches[0];
        let x=t.clientX-dragState.offX;
        let y=t.clientY-dragState.offY;
        x=Math.max(0,Math.min(window.innerWidth-dragState.el.offsetWidth,x));
        y=Math.max(0,Math.min(window.innerHeight-dragState.el.offsetHeight,y));
        dragState.el.style.left=x+'px';
        dragState.el.style.top=y+'px';
        dragState.el.style.right='auto';
        dragState.el.style.bottom='auto';
    });

    const stopDrag=()=>{
        if(dragState.active&&dragState.el){
            dragState.el.classList.remove('dragging');
            dragState.active=false;
            dragState.el=null;
        }
    };
    document.addEventListener('mouseup',stopDrag);
    document.addEventListener('touchend',stopDrag);

    makeDraggable(learnPanel,learnHeader,['.learn-collapse-btn','.learn-close-btn']);

    if (learnCollapseBtn) {
        learnCollapseBtn.addEventListener('click', () => {
            learnPanel.classList.toggle('collapsed');
            learnCollapseBtn.textContent = learnPanel.classList.contains('collapsed') ? '+' : '−';
        });
    }

    if (learnCloseBtn) {
        learnCloseBtn.addEventListener('click', () => {
            learnPanel.style.display = 'none';
            stopLearnRun();

            document.querySelectorAll('.pole').forEach(p => p.classList.remove('from', 'to'));
        });
    }

    window.addEventListener('keydown', (e) => {
        if (MODE !== 'learn' || learnPanel.style.display === 'none') return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stopLearnRun();
            stepLearn(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stopLearnRun();
            stepLearn(1);
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (learnRunning) stopLearnRun();
            else startLearnRun();
        } else if (e.key === 'Home') {
            e.preventDefault();
            stopLearnRun();
            learnIdx = 0;
            renderLearnTrace();
        } else if (e.key === 'End') {
            e.preventDefault();
            stopLearnRun();
            learnIdx = learnEvents.length - 1;
            renderLearnTrace();
        } else if (e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (learnCollapseBtn) learnCollapseBtn.click();
        } else if (e.key.toLowerCase() === 'x') {
            e.preventDefault();
            if (learnCloseBtn) learnCloseBtn.click();
        }
    });

    function saveGameState() {
        try {
            if (run) return;
            const poles = {};
            document.querySelectorAll('.pole').forEach(p => {
                poles[p.id] = Array.from(p.querySelectorAll('.disk')).map(d => +d.dataset.size);
            });
            const state = {
                MODE,
                n,
                moves,
                undoCount,
                mvHist,
                poles,
                theme: thE.value,
                sound: sndE.checked,
                sbOpt: sbOpt,
                timeElapsed: t0 ? (Date.now() - t0) : 0,
                selTitle,
                unlockAch,
                usedAuto
            };
            localStorage.setItem('hanoi_game_state_v3', JSON.stringify(state));
        } catch (e) {}
    }

    function loadGameState() {
        try {
            const raw = localStorage.getItem('hanoi_game_state_v3');
            if (!raw) return false;

            const s = JSON.parse(raw);
            if (!s) return false;

            if (s.MODE === 'demo') {
                 localStorage.removeItem('hanoi_game_state_v3');
                 return false;
            }

            thE.value = s.theme || 'classic';
            sndE.checked = s.sound !== undefined ? s.sound : true;
            n = s.n || n;
            sbOpt = s.sbOpt || sbOpt;

            MODE = (s.MODE === 'learn' || s.MODE === 'teach') ? 'play' : (s.MODE || MODE);
            mvHist = s.mvHist || [];
            unlockAch = s.unlockAch || unlockAch;
            selTitle = s.selTitle || selTitle;
            usedAuto = !!s.usedAuto;

            applyModeChange();

            const polesObj = s.poles || {};
            document.querySelectorAll('.pole').forEach(p => {
                 // Remove old listeners before innerHTML wipe
                 const oldDragover = p._dragoverHandler;
                 const oldDrop = p._dropHandler;
                 if (oldDragover) p.removeEventListener('dragover', oldDragover);
                 if (oldDrop) p.removeEventListener('drop', oldDrop);
                 
                 p.innerHTML = `<div class="peg"></div><div class="pole-label">${(p.id.charCodeAt(0) - 96)}</div>`;
                 addPoleListeners(p);
            });

            const theme = thE.value;
            const emojis = EMOJIS[theme];

            Object.keys(polesObj).forEach(pid => {
                const poleEl = document.getElementById(pid);
                if (!poleEl) return;

                polesObj[pid].forEach(size => {
                    const d = document.createElement('div');
                    d.className = 'disk';
                    d.dataset.size = size;
                    d.id = `disk-${size}-${Math.floor(Math.random() * 1e6)}`;
                    const width = 40 + size * 18;
                    d.style.width = width + 'px';
                    d.style.background = diskCols[(size - 1) % diskCols.length];

                    const lbl = document.createElement('div');
                    lbl.className = 'disk--label';

                    let emoji = (emojis && size <= emojis.length) ? emojis[size - 1] : null;
                    let labelContent = '';
                    if (emoji) {
                        labelContent = `<span class="emoji" role="img">${emoji}</span><span class="num">${size}</span>`;
                    } else {
                        labelContent = `<span class="num">${size}</span>`;
                    }
                    lbl.innerHTML = labelContent;
                    d.appendChild(lbl);
                    d.style.zIndex = CONSTANTS.DISK_BASE_ZINDEX + size;
                    d.draggable = true;
                    
                    // Store dragstart handler for cleanup
                    const dragstartHandler = (ev) => {
                        if (!run) {
                            try { ev.dataTransfer.setData('text/plain', d.id); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
                            if (!t0 && !chActive) { 
                                t0 = Date.now(); 
                                // Clear old timer first to prevent leak
                                if (tmr) clearInterval(tmr);
                                tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
                            }
                            playSound(pickupSnd);
                        } else {
                            ev.preventDefault();
                        }
                    };
                    
                    d._dragstartHandler = dragstartHandler;
                    d.addEventListener('dragstart', dragstartHandler);
                    
                    // Mobile touch support
                    const touchStartHandler = (e) => {
                        if (run) return;
                        e.preventDefault();
                        
                        const touch = e.touches[0];
                        const diskEl = d;
                        const pole = diskEl.parentElement;
                        
                        const disksInPole = pole.querySelectorAll('.disk');
                        const topDisk = disksInPole[disksInPole.length - 1];
                        if (diskEl !== topDisk) return;
                        
                        if (!t0 && !chActive) {
                            t0 = Date.now();
                            if (tmr) clearInterval(tmr);
                            tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
                        }
                        
                        touchState.active = true;
                        touchState.diskId = diskEl.id;
                        touchState.fromPole = pole.id;
                        touchState.initialY = touch.clientY;
                        touchState.currentY = touch.clientY;
                        
                        diskEl.classList.add('held');
                        playSound(pickupSnd);
                    };
                    
                    const touchMoveHandler = (e) => {
                        if (!touchState.active || touchState.diskId !== d.id) return;
                        e.preventDefault();
                        
                        const touch = e.touches[0];
                        touchState.currentY = touch.clientY;
                        
                        const deltaY = touchState.initialY - touchState.currentY;
                        if (deltaY > 10) {
                            d.style.transform = `translateY(-${Math.min(deltaY, 50)}px)`;
                        }
                    };
                    
                    const touchEndHandler = (e) => {
                        if (!touchState.active || touchState.diskId !== d.id) return;
                        
                        d.classList.remove('held');
                        d.style.transform = '';
                        
                        const touch = e.changedTouches[0];
                        const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
                        let targetPole = elementAtPoint?.closest('.pole');
                        
                        if (targetPole && isValidMove(touchState.fromPole, targetPole.id, d.dataset.size)) {
                            executeMove(touchState.fromPole, targetPole.id);
                        } else {
                            showErrorPopup();
                        }
                        
                        touchState.active = false;
                        touchState.diskId = null;
                        touchState.fromPole = null;
                    };
                    
                    d._touchStartHandler = touchStartHandler;
                    d._touchMoveHandler = touchMoveHandler;
                    d._touchEndHandler = touchEndHandler;
                    
                    d.addEventListener('touchstart', touchStartHandler, { passive: false });
                    d.addEventListener('touchmove', touchMoveHandler, { passive: false });
                    d.addEventListener('touchend', touchEndHandler);
                    
                    poleEl.appendChild(d);
                });
            });

            moves = s.moves || 0;
            mvE.textContent = moves;
            undoCount = s.undoCount || 0;

            if (s.timeElapsed) {
                t0 = Date.now() - s.timeElapsed;
                // Clear old timer first to prevent leak
                if (tmr) clearInterval(tmr);
                tmr = setInterval(() => { tE.textContent = formatTime(Math.floor((Date.now() - t0) / 1000)) }, 250);
            } else {
                t0 = null;
            }

            updateTopDisks();
            updateProgressBar();
            updateBestScoreDisplay();
            updateUndoButton();
            renderAchievements();
            updateTitleDisplay();
            return true;
        } catch (e) {
            ErrLog.log(e, 'loadGameState');
            localStorage.removeItem('hanoi_game_state_v3');
            return false;
        }
    }

    window.addEventListener('beforeunload', saveGameState);

    // Daily sandbox config
    window.startSandboxWithConfig = function(poles, disks, rule, startPos, target, isDaily) {
        sbOpt.poleCount = poles;
        sbOpt.diskCount = disks;
        sbOpt.rule = rule;
        sbOpt.startPos = startPos || 'classic';
        sbOpt.target = target || 'any_other';
        n = disks;
        nE.value = n;
        MODE = 'sandbox';
        if (isDaily) window._isDailyChallenge = true;
        applyModeChange();
    };

    // Debug Helpers
    if (typeof window !== 'undefined') {
        window.HanoiDebug = {
            errors: () => ErrLog.errs,
            state: () => ({
                mode: MODE,
                moves: moves,
                disks: n,
                achievements: unlockAch.length,
                time: t0 ? Math.floor((Date.now() - t0) / 1000) : 0
            }),
            resetAch: () => {
                if (confirm('Reset achievements?')) {
                    localStorage.removeItem('hanoi_unlocked_achievements');
                    localStorage.removeItem('hanoi_selected_title');
                    location.reload();
                }
            },
            info: () => BI
        };
        window.HANOI_INFO = BI;
        console.log('%c💡 Debug: HanoiDebug.state()', 'color:#10b981');
    }

})();