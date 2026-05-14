// Boss直聘AI投递助手 - 页面脚本

let settings = {
  skills: [],
  targetPosition: '',
  experience: '',
  salary: '',
  introTemplate: '您好，我对贵公司的这个职位非常感兴趣，期待进一步交流！',
  matchMode: 'auto',
  matchThreshold: 60
};

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startApply') {
    settings = request.settings;
    startAutoApply();
  }
});

// 自动投递主函数
async function startAutoApply() {
  console.log('🤖 开始自动投递...');
  console.log('设置:', settings);
  
  const jobs = extractJobs();
  console.log(`找到 ${jobs.length} 个职位`);
  
  // 更新匹配数量
  chrome.storage.local.get('boss_ai_stats', (result) => {
    const stats = result.boss_ai_stats || { appliedCount: 0, successCount: 0, matchCount: 0 };
    stats.matchCount = jobs.length;
    chrome.storage.local.set({ 'boss_ai_stats': stats });
  });
  
  let appliedCount = 0;
  let successCount = 0;
  
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const matchScore = calculateMatchScore(job);
    
    console.log(`职位: ${job.title} - 匹配度: ${matchScore}%`);
    
    if (matchScore >= settings.matchThreshold) {
      const success = await applyToJob(job);
      if (success) {
        successCount++;
      }
      appliedCount++;
      
      // 更新统计
      chrome.storage.local.get('boss_ai_stats', (result) => {
        const stats = result.boss_ai_stats || { appliedCount: 0, successCount: 0, matchCount: 0 };
        stats.appliedCount = appliedCount;
        stats.successCount = successCount;
        chrome.storage.local.set({ 'boss_ai_stats': stats });
      });
      
      // 随机延迟，避免被封禁
      await delay(2000 + Math.random() * 3000);
    }
  }
  
  // 返回结果
  chrome.runtime.sendMessage({
    action: 'applyComplete',
    appliedCount,
    successCount,
    matchCount: jobs.length
  });
  
  console.log(`✅ 投递完成！已投递 ${appliedCount} 个职位，成功 ${successCount} 个`);
}

// 提取职位信息
function extractJobs() {
  const jobs = [];
  const jobCards = document.querySelectorAll('.job-card-wrapper, .job-item');
  
  jobCards.forEach(card => {
    const job = {};
    
    // 职位标题
    const titleElement = card.querySelector('.job-name, .job-title');
    if (titleElement) {
      job.title = titleElement.textContent.trim();
    }
    
    // 公司名称
    const companyElement = card.querySelector('.company-name');
    if (companyElement) {
      job.company = companyElement.textContent.trim();
    }
    
    // 薪资
    const salaryElement = card.querySelector('.salary');
    if (salaryElement) {
      job.salary = salaryElement.textContent.trim();
    }
    
    // 地点
    const locationElement = card.querySelector('.job-area, .job-location');
    if (locationElement) {
      job.location = locationElement.textContent.trim();
    }
    
    // 要求信息（经验、学历）
    const infoElement = card.querySelector('.job-info');
    if (infoElement) {
      const info = infoElement.textContent.trim();
      const parts = info.split('·');
      if (parts.length >= 1) job.experience = parts[0].trim();
      if (parts.length >= 2) job.education = parts[1].trim();
    }
    
    // 技能标签
    const tagsElement = card.querySelector('.tags');
    if (tagsElement) {
      const tags = Array.from(tagsElement.querySelectorAll('span, .tag'))
        .map(tag => tag.textContent.trim());
      job.skills = tags;
    }
    
    // 职位链接
    const linkElement = card.querySelector('a');
    if (linkElement) {
      job.url = linkElement.href;
      job.id = extractJobId(linkElement.href);
    }
    
    // 投递按钮
    const applyBtn = card.querySelector('.btn-apply, .btn-startchat, [ka="btnChat"]');
    if (applyBtn) {
      job.applyButton = applyBtn;
    }
    
    if (job.title) {
      jobs.push(job);
    }
  });
  
  return jobs;
}

// 从URL提取职位ID
function extractJobId(url) {
  const match = url.match(/job_detail\/([a-zA-Z0-9]+)\.html/);
  return match ? match[1] : null;
}

// 计算匹配度
function calculateMatchScore(job) {
  let score = 0;
  let maxScore = 0;
  
  // 技能匹配（60分）
  if (settings.skills.length > 0 && job.skills) {
    maxScore += 60;
    let matchedSkills = 0;
    settings.skills.forEach(skill => {
      const lowerSkill = skill.toLowerCase();
      job.skills.forEach(jobSkill => {
        if (jobSkill.toLowerCase().includes(lowerSkill)) {
          matchedSkills++;
        }
      });
    });
    score += Math.min(60, (matchedSkills / settings.skills.length) * 60);
  }
  
  // 职位名称匹配（20分）
  if (settings.targetPosition && job.title) {
    maxScore += 20;
    const keywords = settings.targetPosition.split(' ').filter(k => k);
    keywords.forEach(keyword => {
      if (job.title.toLowerCase().includes(keyword.toLowerCase())) {
        score += 10;
      }
    });
    score = Math.min(score, maxScore);
  }
  
  // 经验匹配（20分）
  if (settings.experience && job.experience) {
    maxScore += 20;
    const expMap = { '1-3': ['1', '2', '3', '一', '二', '三'],
                     '3-5': ['3', '4', '5', '三', '四', '五'],
                     '5-10': ['5', '6', '7', '8', '9', '10', '五', '六', '七', '八', '九', '十'],
                     '10+': ['10', '十', '11', '12', '13', '14', '15'] };
    
    const targetExp = expMap[settings.experience];
    if (targetExp) {
      targetExp.forEach(exp => {
        if (job.experience.includes(exp)) {
          score += 20;
        }
      });
    }
  }
  
  // 如果maxScore为0，返回默认分数
  if (maxScore === 0) return 100;
  
  return Math.round((score / maxScore) * 100);
}

// 查找包含指定文本的按钮
function findButtonByText(text) {
  const buttons = document.querySelectorAll('button, a');
  for (const btn of buttons) {
    if (btn.textContent && btn.textContent.includes(text) && !btn.disabled) {
      return btn;
    }
  }
  return null;
}

// 投递职位
async function applyToJob(job) {
  try {
    // 如果有直接投递按钮，点击它
    if (job.applyButton) {
      job.applyButton.click();
      await delay(1500);
      
      // 步骤1：检查是否有"继续沟通"弹窗
      const continueBtn = findButtonByText('继续沟通');
      if (continueBtn) {
        continueBtn.click();
        await delay(1500);
      }
      
      // 步骤2：检查是否有"留在此页"弹窗
      const stayBtn = findButtonByText('留在此页');
      if (stayBtn) {
        stayBtn.click();
        await delay(1500);
      }
      
      // 步骤3：检查是否弹出了聊天窗口
      const chatModal = document.querySelector('.chat-dialog, .im-chat, .chat-container, [class*="chat"]');
      if (chatModal) {
        // 填写自我介绍
        const inputArea = chatModal.querySelector('textarea, [contenteditable="true"], .chat-input input');
        if (inputArea) {
          const intro = settings.introTemplate.replace('{skills}', settings.skills.join('、'));
          inputArea.value = intro;
          inputArea.dispatchEvent(new Event('input', { bubbles: true }));
          inputArea.dispatchEvent(new Event('change', { bubbles: true }));
          
          // 点击发送按钮
          const sendBtn = chatModal.querySelector('.btn-send, [ka="btnSend"], .send-btn, [type="submit"]');
          if (sendBtn && !sendBtn.disabled) {
            await delay(500);
            sendBtn.click();
            await delay(1500);
            return true;
          }
        }
      }
      
      // 如果聊天窗口不在当前页面，尝试查找页面上的聊天输入区域
      const pageInputArea = document.querySelector('.chat-input textarea, .im-input textarea, [placeholder*="打招呼"], [placeholder*="发送消息"]');
      if (pageInputArea) {
        const intro = settings.introTemplate.replace('{skills}', settings.skills.join('、'));
        pageInputArea.value = intro;
        pageInputArea.dispatchEvent(new Event('input', { bubbles: true }));
        
        const pageSendBtn = document.querySelector('.btn-send, [ka="btnSend"], .im-send-btn');
        if (pageSendBtn && !pageSendBtn.disabled) {
          await delay(500);
          pageSendBtn.click();
          await delay(1500);
          return true;
        }
      }
      
      return true;
    }
    
    // 如果没有直接按钮，尝试打开职位详情页
    if (job.url) {
      window.open(job.url, '_blank');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('投递失败:', error);
    return false;
  }
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 页面加载完成后添加UI元素
document.addEventListener('DOMContentLoaded', () => {
  addMatchIndicator();
});

// 监听页面变化
const observer = new MutationObserver(() => {
  addMatchIndicator();
});
observer.observe(document.body, { childList: true, subtree: true });

// 添加匹配度指示器
function addMatchIndicator() {
  const jobCards = document.querySelectorAll('.job-card-wrapper, .job-item');
  
  jobCards.forEach(card => {
    // 避免重复添加
    if (card.querySelector('.match-indicator')) return;
    
    const job = extractJobFromCard(card);
    const matchScore = calculateMatchScore(job);
    
    // 创建匹配度指示器
    const indicator = document.createElement('div');
    indicator.className = 'match-indicator';
    indicator.textContent = `${matchScore}%`;
    indicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: ${matchScore >= 80 ? '#52c41a' : matchScore >= 60 ? '#faad14' : '#f5222d'};
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      z-index: 100;
    `;
    
    card.style.position = 'relative';
    card.appendChild(indicator);
  });
}

// 从卡片提取职位信息（简化版）
function extractJobFromCard(card) {
  const job = {};
  
  const titleElement = card.querySelector('.job-name, .job-title');
  if (titleElement) job.title = titleElement.textContent.trim();
  
  const infoElement = card.querySelector('.job-info');
  if (infoElement) {
    const parts = infoElement.textContent.trim().split('·');
    if (parts.length >= 1) job.experience = parts[0].trim();
  }
  
  const tagsElement = card.querySelector('.tags');
  if (tagsElement) {
    job.skills = Array.from(tagsElement.querySelectorAll('span, .tag'))
      .map(tag => tag.textContent.trim());
  }
  
  return job;
}
