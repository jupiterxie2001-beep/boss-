document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // 技能标签点击事件
  document.querySelectorAll('.skill-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
      // 保存设置并刷新匹配度显示
      saveSettingsAndRefresh();
    });
  });
  
  // 输入框变化时也刷新
  document.getElementById('targetPosition').addEventListener('change', saveSettingsAndRefresh);
  document.getElementById('matchThreshold').addEventListener('change', saveSettingsAndRefresh);
  document.getElementById('customSkills').addEventListener('change', saveSettingsAndRefresh);
  
  // 开始投递按钮
  document.getElementById('startBtn').addEventListener('click', async () => {
    const settings = getSettings();
    
    if (settings.skills.length === 0 && !settings.targetPosition) {
      showStatus('error', '请至少选择一项技能或设置目标职位');
      return;
    }
    
    await chrome.storage.local.set({ 'boss_ai_settings': settings });
    showStatus('info', '正在分析页面...');
    
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab.url.includes('zhipin.com')) {
        showStatus('error', '请在Boss直聘页面使用此功能');
        return;
      }
      
      try {
        const response = await sendMessageToContent({ action: 'startApply', settings });
        if (response && response.success) {
          showStatus('success', '投递任务已启动');
        } else {
          showStatus('error', response?.message || '投递失败');
        }
      } catch (error) {
        showStatus('error', '发送消息失败，请刷新页面重试');
      }
    });
  });
  
  loadStats();
});

async function saveSettingsAndRefresh() {
  const settings = getSettings();
  await chrome.storage.local.set({ 'boss_ai_settings': settings });
  
  // 刷新页面匹配度显示
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'refreshMatch' });
  });
}

function sendMessageToContent(message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  });
}

function getSettings() {
  const selectedSkills = Array.from(document.querySelectorAll('.skill-tag.active'))
    .map(tag => tag.dataset.skill);
  const customSkills = document.getElementById('customSkills').value;
  if (customSkills) {
    selectedSkills.push(...customSkills.split(/[\s,，、]+/).map(s => s.trim()).filter(s => s));
  }
  
  return {
    skills: selectedSkills,
    targetPosition: document.getElementById('targetPosition').value,
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
    if (settings.matchThreshold) {
      document.getElementById('matchThreshold').value = settings.matchThreshold;
    }
  });
}

function loadStats() {
  chrome.storage.local.get('boss_ai_stats', (result) => {
    const stats = result.boss_ai_stats || { appliedCount: 0, successCount: 0, matchCount: 0 };
    document.getElementById('appliedCount').textContent = stats.appliedCount;
    document.getElementById('successCount').textContent = stats.successCount;
    document.getElementById('matchCount').textContent = stats.matchCount;
  });
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