document.addEventListener('DOMContentLoaded', () => {
  // 加载保存的设置
  loadSettings();
  
  // 技能标签点击事件
  document.querySelectorAll('.skill-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
    });
  });
  
  // 切换按钮事件
  document.getElementById('autoMatchBtn').addEventListener('click', () => {
    document.getElementById('autoMatchBtn').classList.add('active');
    document.getElementById('manualMatchBtn').classList.remove('active');
  });
  
  document.getElementById('manualMatchBtn').addEventListener('click', () => {
    document.getElementById('manualMatchBtn').classList.add('active');
    document.getElementById('autoMatchBtn').classList.remove('active');
  });
  
  // 开始投递按钮
  document.getElementById('startBtn').addEventListener('click', async () => {
    const settings = getSettings();
    await chrome.storage.local.set({ 'boss_ai_settings': settings });
    
    showStatus('info', '正在分析页面...');
    
    // 向content script发送消息开始投递
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startApply', settings }, (response) => {
        if (response && response.success) {
          showStatus('success', `已找到 ${response.matchCount} 个匹配岗位，正在投递...`);
          updateStats(response.appliedCount, response.successCount);
        } else {
          showStatus('error', response?.message || '投递失败，请重试');
        }
      });
    });
  });
  
  // 重置统计按钮
  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.storage.local.set({ 
      'boss_ai_stats': { appliedCount: 0, successCount: 0, matchCount: 0 } 
    }, () => {
      updateStats(0, 0);
      showStatus('info', '统计已重置');
    });
  });
  
  // 加载统计数据
  loadStats();
});

function getSettings() {
  const selectedSkills = Array.from(document.querySelectorAll('.skill-tag.active'))
    .map(tag => tag.dataset.skill);
  const customSkills = document.getElementById('customSkills').value;
  if (customSkills) {
    selectedSkills.push(...customSkills.split(',').map(s => s.trim()).filter(s => s));
  }
  
  return {
    skills: selectedSkills,
    targetPosition: document.getElementById('targetPosition').value,
    experience: document.getElementById('experience').value,
    salary: document.getElementById('salary').value,
    introTemplate: document.getElementById('introTemplate').value,
    matchMode: document.getElementById('autoMatchBtn').classList.contains('active') ? 'auto' : 'manual',
    matchThreshold: parseInt(document.getElementById('matchThreshold').value) || 60
  };
}

function loadSettings() {
  chrome.storage.local.get('boss_ai_settings', (result) => {
    const settings = result.boss_ai_settings || {};
    
    if (settings.skills) {
      document.querySelectorAll('.skill-tag').forEach(tag => {
        if (settings.skills.includes(tag.dataset.skill)) {
          tag.classList.add('active');
        }
      });
    }
    
    if (settings.targetPosition) {
      document.getElementById('targetPosition').value = settings.targetPosition;
    }
    if (settings.experience) {
      document.getElementById('experience').value = settings.experience;
    }
    if (settings.salary) {
      document.getElementById('salary').value = settings.salary;
    }
    if (settings.introTemplate) {
      document.getElementById('introTemplate').value = settings.introTemplate;
    }
    if (settings.matchMode === 'manual') {
      document.getElementById('manualMatchBtn').classList.add('active');
      document.getElementById('autoMatchBtn').classList.remove('active');
    }
    if (settings.matchThreshold) {
      document.getElementById('matchThreshold').value = settings.matchThreshold;
    }
  });
}

function loadStats() {
  chrome.storage.local.get('boss_ai_stats', (result) => {
    const stats = result.boss_ai_stats || { appliedCount: 0, successCount: 0, matchCount: 0 };
    updateStats(stats.appliedCount, stats.successCount);
    document.getElementById('matchCount').textContent = stats.matchCount;
  });
}

function updateStats(applied, success) {
  document.getElementById('appliedCount').textContent = applied;
  document.getElementById('successCount').textContent = success;
}

function showStatus(type, message) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}
