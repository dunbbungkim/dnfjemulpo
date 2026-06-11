const TOTAL_SLOTS = 105; 
const gridContainer = document.getElementById('inventory-grid');
const countDisplay = document.getElementById('sacrifice-count');

let currentType = '강화'; 
let inventoryState = new Array(TOTAL_SLOTS).fill(null);
let bubbleTimeout = null;

let continuousFailCount = 0; 
let lastKnownLevel = 13; 

const SUCCESS_RATES = {
    '강화': { 10: 0.25, 11: 0.15, 12: 0.14, 13: 0.13, 14: 0.12, 15: 0.11, 16: 0.10, 17: 0.10, 18: 0.10, 19: 0.10, 20: 0.10 },
    '증폭': { 10: 0.40, 11: 0.30, 12: 0.20, 13: 0.20, 14: 0.20, 15: 0.20, 16: 0.20, 17: 0.20, 18: 0.20, 19: 0.20, 20: 0.20 }
};

// 🎵 [결전의 브금 데이터베이스]
const BGM_LIST = [
    { id: "wLT431Yb-98", title: "마이스터의 실험실 출격장" },
    { id: "lJ-_P3ip7pY", title: "빌마르크 제국 실험장" },
    { id: "DM_IkiYW_lo", title: "왕의 유적" },
    { id: "AOSeY7zs4v0", title: "성주의 궁" },
    { id: "LlgRUhZiYxI", title: "사망의 탑 상층" },
    { id: "epLUcWBHyZQ", title: "산등성이" },
    { id: "NtDQDIig2ng", title: "백야" },
    { id: "05YVMEK0Fr0", title: "열차 위의 해적" },
    { id: "WYt9tmhKkFM", title: "언더풋 입구" },
    { id: "qdeBzZXzYAI", title: "란제루스의 개" },
    { id: "PS2UabVb5Nk", title: "섈로우 킵" },
    { id: "L8cOD37PhvE", title: "추격 섬멸전" },
    { id: "U5bJXly9hYM", title: "이계의 틈" },
    { id: "o5YDCX-9S7c", title: "마계의 틈" },
    { id: "BDBSwHHHCI4", title: "신전 외곽" },
    { id: "_f4ufSU-U_k", title: "머크우드" },
    { id: "-mJPeme5_tU", title: "무한의 제단" },
    { id: "fLzxsGfqCVU", title: "천공의 둥지 (프레이-이시스)" },
    { id: "65dmQl9hYAA", title: "혼돈의 왕좌 (오즈마)" },
    { id: "dhDKaNEJR78", title: "폭룡왕의 정전 (바칼)" },
    { id: "jHrEtrVhK7o", title: "더 파이퍼" },
    { id: "qo4Y0EJGTow", title: "(구) 결투장" },
    { id: "JeVB78rWc0A", title: "결투장 - 추격 섬멸전" },
    { id: "Tl04eLdQWNc", title: "결투장 - 달빛주점" },
    { id: "cESVsDm5Bvk", title: "결투장 - 오데사 시가전" }
];

let currentBgmIndex = 0; 

// 📋 [강화 로그 메인 관제 데이터 스토어]
let globalSequenceCount = 0; 
let lowestFailProbability = null; 
let statisticsStore = {}; 
let feedDataArray = []; 

function initInventory() {
    gridContainer.innerHTML = '';
    inventoryState[0] = 13; 
    lastKnownLevel = 13; 

    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.dataset.index = i;
        gridContainer.appendChild(slot);
    }
    
    initBgmSliderSystem(); 
    renderSystem();
}

function initBgmSliderSystem() {
    const track = document.getElementById('bgm-title-track');
    track.innerHTML = '';
    
    BGM_LIST.forEach(bgm => {
        const card = document.createElement('div');
        card.className = 'bgm-title-card';
        card.innerText = bgm.title;
        track.appendChild(card);
    });

    document.getElementById('bgm-player').src = `https://www.youtube.com/embed/${BGM_LIST[currentBgmIndex].id}`;
}

function moveBgmTrack(direction) {
    currentBgmIndex += direction;
    
    if (currentBgmIndex < 0) currentBgmIndex = BGM_LIST.length - 1;
    if (currentBgmIndex >= BGM_LIST.length) currentBgmIndex = 0;

    document.getElementById('bgm-player').src = `https://www.youtube.com/embed/${BGM_LIST[currentBgmIndex].id}`;

    const track = document.getElementById('bgm-title-track');
    track.style.transform = `translateX(-${currentBgmIndex * 100}%)`;
}

function renderSystem() {
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = gridContainer.children[i];
        if (inventoryState[i] !== null) {
            const lvl = inventoryState[i];
            const folder = (currentType === '강화') ? 'rino' : 'golgo';
            const prefix = (currentType === '강화') ? 'rino' : 'golgo';
            slot.innerHTML = `<img src="./image/${folder}/${prefix}_${lvl}.png" alt="+${lvl} ${currentType} 제물" class="sacrifice-img">`;
        } else {
            slot.innerHTML = '';
        }
    }
    
    const totalActive = inventoryState.filter(item => item !== null).length;
    countDisplay.innerText = totalActive;

    const enhancerBg = document.getElementById('enhancer-bg');
    const centerSlot = document.getElementById('enhancer-center-slot');
    const triggerBtn = document.getElementById('reinforce-trigger-btn');
    
    if (currentType === '강화') {
        enhancerBg.style.backgroundImage = "url('./image/enhancer/enhancer_kiri.png')";
    } else {
        enhancerBg.style.backgroundImage = "url('./image/enhancer/enhancer_klonter.png')";
    }

    const firstSlotItem = inventoryState[0]; 
    const baseSuccessDisplay = document.getElementById('base-success-display');

    if (firstSlotItem !== null) {
        lastKnownLevel = firstSlotItem; 
        
        const folder = (currentType === '강화') ? 'rino' : 'golgo';
        const prefix = (currentType === '강화') ? 'rino' : 'golgo';
        centerSlot.innerHTML = `<img src="./image/${folder}/${prefix}_${firstSlotItem}.png" class="sacrifice-img">`;
        
        const rawRate = SUCCESS_RATES[currentType][firstSlotItem] || 0.10;
        baseSuccessDisplay.innerText = Math.round(rawRate * 100);
        triggerBtn.disabled = false;
    } else {
        centerSlot.innerHTML = '';
        const cachedRate = SUCCESS_RATES[currentType][lastKnownLevel] || 0.10;
        baseSuccessDisplay.innerText = Math.round(cachedRate * 100);
        triggerBtn.disabled = true; 
    }

    calculateMathematicalStack();
}

function calculateMathematicalStack() {
    const failCountDisplay = document.getElementById('fail-count-display');
    const probLine1 = document.getElementById('prob-display-1');
    const probLine2 = document.getElementById('prob-display-2');
    const statusPanel = document.getElementById('status-panel');

    failCountDisplay.innerText = continuousFailCount;

    const activeLevel = (inventoryState[0] !== null) ? inventoryState[0] : lastKnownLevel;
    const p_success = SUCCESS_RATES[currentType][activeLevel] || 0.10;
    const p_fail = 1 - p_success; 

    const nextTotalFailCount = continuousFailCount + 1;
    const finalCumulativeFailRate = Math.pow(p_fail, nextTotalFailCount);
    const finalCumulativeFailPercent = finalCumulativeFailRate * 100;
    const inverseSuccessPercent = 100 - finalCumulativeFailPercent;

    probLine1.innerHTML = `한 번 더 질렀을 때 실패할 확률 (${nextTotalFailCount}연속 실패) : <span class="prob-fail-highlight">${finalCumulativeFailPercent.toFixed(2)}%</span>`;
    probLine2.innerHTML = `지금 본템 지르면 <span class="prob-success-highlight">${inverseSuccessPercent.toFixed(2)}%</span> 확률로 성공! WOW!`;
    
    const score = inverseSuccessPercent; 

    if (score >= 99) {
        statusPanel.style.background = "linear-gradient(to bottom, #d531cc, #ffc840, #ffdf06)";
    } else if (score >= 95) {
        statusPanel.style.background = "linear-gradient(to bottom, #57bdfe, #50f2e9, #52ff95)";
    } else if (score >= 90) {
        statusPanel.style.background = "#ffd800";
    } else if (score >= 80) {
        statusPanel.style.background = "#ff9400";
    } else if (score >= 70) {
        statusPanel.style.background = "#ff00df";
    } else {
        statusPanel.style.background = "#b274ff";
    }

    return finalCumulativeFailPercent; 
}

function simulateSacrifice() {
    const firstSlotItem = inventoryState[0];
    if (firstSlotItem === null) return;

    lastKnownLevel = firstSlotItem;
    globalSequenceCount++; 

    const successProbability = SUCCESS_RATES[currentType][firstSlotItem] || 0.10;
    const randomSeed = Math.random(); 

    const logPanel = document.getElementById('log-panel');
    const typeWord = currentType;
    
    const currentStepFailPercent = calculateMathematicalStack();

    let isSuccess = false;
    let resultLogMessage = "";

    if (randomSeed < successProbability) {
        logPanel.innerHTML = `<div style="color:#22c55e;">${typeWord} 성공.. 스택 초기화</div>`;
        createFloatingText("성공..", "#52ff95");
        isSuccess = true;
        resultLogMessage = `[${globalSequenceCount}회차] +${firstSlotItem} ${typeWord} <span class="log-text-success">성공</span> (스택 초기화)`;
        continuousFailCount = 0;
    } else {
        continuousFailCount++;
        logPanel.innerHTML = `<div style="color:#ef4444;">${typeWord} 실패! 스택 +1</div>`;
        createFloatingText("실패!", "#ff3b3b");
        isSuccess = false;
        resultLogMessage = `[${globalSequenceCount}회차] +${firstSlotItem} ${typeWord} <span class="log-text-fail">실패</span> (스택 +1)`;
    }

    processLogBusinessLogic(typeWord, firstSlotItem, isSuccess, currentStepFailPercent, resultLogMessage);

    inventoryState[0] = null;
    for (let i = 0; i < TOTAL_SLOTS - 1; i++) {
        inventoryState[i] = inventoryState[i + 1];
    }
    inventoryState[TOTAL_SLOTS - 1] = null; 

    renderSystem();
}

function processLogBusinessLogic(type, level, isSuccess, failPercent, feedMessage) {
    const activeLevel = (inventoryState[0] !== null) ? inventoryState[0] : lastKnownLevel;
    const p_success = SUCCESS_RATES[currentType][activeLevel] || 0.10;
    const p_fail = 1 - p_success;

    const nextTotalFailCount = continuousFailCount + 1;
    const currentNextFailPercent = Math.pow(p_fail, nextTotalFailCount) * 100;

    if (lowestFailProbability === null || currentNextFailPercent < lowestFailProbability) {
        lowestFailProbability = currentNextFailPercent;
        
        const inverseSuccess = 100 - lowestFailProbability; 
        let gradeName = "레어";
        let gradeColor = "#b274ff";
        let gradeBg = "#b274ff";

        if (inverseSuccess >= 99) {
            gradeName = "신화";
            gradeColor = "#ffdf06";
            gradeBg = "linear-gradient(to bottom, #d531cc, #ffc840, #ffdf06)";
        } else if (inverseSuccess >= 95) {
            gradeName = "태초";
            gradeColor = "#50f2e9";
            gradeBg = "linear-gradient(to bottom, #57bdfe, #50f2e9, #52ff95)";
        } else if (inverseSuccess >= 90) {
            gradeName = "에픽";
            gradeColor = "#ffd800";
            gradeBg = "#ffd800";
        } else if (inverseSuccess >= 80) {
            gradeName = "레전더리";
            gradeColor = "#ff9400";
            gradeBg = "#ff9400";
        } else if (inverseSuccess >= 70) {
            gradeName = "유니크";
            gradeColor = "#ff00df";
            gradeBg = "#ff00df";
        }

        document.getElementById('log-best-prob-display').innerHTML = `
            <span style="color:${gradeColor === '#ffdf06' ? '#b91c1c' : gradeColor}; font-weight: bold;">
                ${lowestFailProbability.toFixed(2)}%
            </span>
            <span style="font-size: 11px; color: #a3a3a3; margin-left: 4px;">(한 번 더 질렀을 때 실패할 확률)</span>
        `;
        
        const badgeZone = document.getElementById('log-best-badge-zone');
        badgeZone.innerHTML = `<span class="log-best-badge" style="background:${gradeBg};">등급 : ${gradeName}</span>`;
    }

    const tableKey = `${type}_${level}`;
    if (!statisticsStore[tableKey]) {
        statisticsStore[tableKey] = { attempt: 0, success: 0, fail: 0 };
    }
    statisticsStore[tableKey].attempt++;
    if (isSuccess) statisticsStore[tableKey].success++;
    else statisticsStore[tableKey].fail++;

    renderStatsTableUI();

    feedDataArray.unshift(feedMessage); 
    if (feedDataArray.length > 50) {
        feedDataArray.pop(); 
    }

    renderFeedUI();
}

function renderStatsTableUI() {
    const tableContainer = document.getElementById('log-stats-table');
    tableContainer.innerHTML = ''; 

    Object.keys(statisticsStore).sort().forEach(key => {
        const item = statisticsStore[key];
        const parts = key.split('_'); 
        const realSuccessRate = (item.success / item.attempt) * 100;

        const row = document.createElement('div');
        row.className = 'log-stats-row';
        row.innerHTML = `
            <div>+${parts[1]} ${parts[0]}</div>
            <div>시도: ${item.attempt}회 | 성공: ${item.success} | 실패: ${item.fail} <span class="log-highlight-rate">(성공 확률: ${realSuccessRate.toFixed(1)}%)</span></div>
        `;
        tableContainer.appendChild(row);
    });
}

function renderFeedUI() {
    const feedBox = document.getElementById('log-feed-box');
    feedBox.innerHTML = ''; 

    feedDataArray.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'log-feed-item';
        item.innerHTML = msg;
        feedBox.appendChild(item);
    });
}

function createFloatingText(text, color) {
    const container = document.getElementById('ani-container');
    const effectEl = document.createElement('div');
    effectEl.className = 'floating-effect-text';
    effectEl.style.color = color;
    effectEl.innerText = text;
    effectEl.style.top = '40px'; 
    
    container.appendChild(effectEl);
    setTimeout(() => { effectEl.remove(); }, 1200);
}

function toggleType() {
    const reinforceBtn = document.getElementById('toggle-reinforce');
    const amplifyBtn = document.getElementById('toggle-amplify');
    
    if (currentType === '강화') {
        currentType = '증폭';
        reinforceBtn.classList.remove('active');
        amplifyBtn.classList.add('active');
    } else {
        currentType = '강화';
        amplifyBtn.classList.remove('active');
        reinforceBtn.classList.add('active');
    }

    continuousFailCount = 0;
    updateLabelTexts();
    renderSystem();
}

function updateLabelTexts() {
    document.getElementById('type-txt-1').innerText = currentType;
    document.getElementById('type-txt-4').innerText = currentType;
    document.getElementById('reinforce-trigger-btn').innerText = `제물 ${currentType}`;
}

function showBubble(bubbleId, message) {
    const bubble = document.getElementById(bubbleId);
    bubble.innerText = message;
    bubble.style.display = 'block';
    
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => { bubble.style.display = 'none'; }, 2500);
}

function updateAllSacrificeLevels() {
    const targetLevel = parseInt(document.getElementById('level-input').value) || 13;
    let changed = false;
    
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (inventoryState[i] !== null) {
            inventoryState[i] = targetLevel;
            changed = true;
        }
    }
    
    if (!changed) {
        showBubble('level-bubble', '인벤토리에 변경할 제물이 없습니다!');
        return;
    }

    lastKnownLevel = targetLevel; 
    continuousFailCount = 0;
    renderSystem();
}

function handleLevelChange(amount) {
    const input = document.getElementById('level-input');
    let current = parseInt(input.value) || 13;
    
    if (current === 10 && amount === -1) {
        showBubble('level-bubble', '+10 미만 제물은 지원하지 않습니다');
        return;
    }
    if (current === 20 && amount === 1) {
        showBubble('level-bubble', '+20 초과 제물은 지원하지 않습니다');
        return;
    }
    
    let nextValue = current + amount;
    if (nextValue >= 10 && nextValue <= 20) {
        input.value = nextValue;
    }
}

function handleCountChange(amount) {
    const input = document.getElementById('count-input');
    let current = parseInt(input.value) || 1;
    const emptySlotsCount = inventoryState.filter(item => item === null).length;
    
    if (current >= emptySlotsCount && amount === 1) {
        showBubble('count-bubble', '인벤토리가 꽉 찼습니다');
        return;
    }
    
    let nextValue = current + amount;
    if (nextValue >= 1 && nextValue <= TOTAL_SLOTS) {
        input.value = nextValue;
    }
}

function addSacrifices() {
    const currentSelectedLevel = parseInt(document.getElementById('level-input').value) || 13;
    const addCount = parseInt(document.getElementById('count-input').value) || 10;
    
    let levelChanged = false;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (inventoryState[i] !== null && inventoryState[i] !== currentSelectedLevel) {
            inventoryState[i] = currentSelectedLevel;
            levelChanged = true;
        }
    }

    if (levelChanged) {
        continuousFailCount = 0;
    }

    let added = 0;
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        if (added >= addCount) break;
        if (inventoryState[i] === null) {
            inventoryState[i] = currentSelectedLevel;
            added++;
        }
    }

    if (added < addCount && added === 0) {
        showBubble('count-bubble', '인벤토리가 꽉 찼습니다!');
    }

    lastKnownLevel = currentSelectedLevel; 
    renderSystem();
}

function resetInventory() {
    inventoryState.fill(null);
    continuousFailCount = 0; 
    
    const currentInputLvl = parseInt(document.getElementById('level-input').value) || 13;
    lastKnownLevel = currentInputLvl;
    
    renderSystem();
}

// 초기화 진입점 설정
window.onload = initInventory;