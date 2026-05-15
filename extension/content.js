// Boss直聘AI投递助手 - 核心功能脚本
console.log('🤖 Boss直聘AI投递助手已加载');

let settings = {
  skills: [],
  targetPosition: '',
  matchThreshold: 60
};

let settingsLoaded = false;

// 从存储加载设置
chrome.storage.local.get('boss_ai_settings', (result) => {
  if (result.boss_ai_settings) {
    settings = { ...settings, ...result.boss_ai_settings };
    console.log('⚙️ 已加载保存的设置:', settings);
  }
  settingsLoaded = true;
  if (document.readyState === 'complete') {
    addMatchIndicator();
  }
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 收到消息:', request.action, request);
  
  if (request.action === 'startApply') {
    settings = request.settings;
    console.log('⚙️ 设置已更新:', settings);
    chrome.storage.local.set({ 'boss_ai_settings': settings });
    
    // 立即更新匹配度显示
    addMatchIndicator();
    
    startAutoApply().then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, message: err.message });
    });
    return true;
  } else if (request.action === 'getJobCount') {
    const jobs = extractJobs();
    sendResponse({ count: jobs.length });
  } else if (request.action === 'refreshMatch') {
    addMatchIndicator();
    sendResponse({ success: true });
  }
});

// 自动投递主函数
async function startAutoApply() {
  console.log('🚀 开始自动投递...');
  console.log('当前设置:', settings);
  
  const jobs = extractJobs();
  console.log(`📊 找到 ${jobs.length} 个职位`);
  
  if (jobs.length === 0) {
    console.warn('⚠️ 未找到任何职位');
    return;
  }

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const matchScore = calculateMatchScore(job);
    
    console.log(`\n--- 职位 ${i + 1}/${jobs.length} ---`);
    console.log(`职位: ${job.title}`);
    console.log(`技能: ${job.skills?.join(', ') || '无'}`);
    console.log(`匹配度: ${matchScore}% (阈值: ${settings.matchThreshold}%)`);
    
    if (matchScore >= settings.matchThreshold) {
      console.log(`✅ 匹配度达标，准备投递`);
      if (job.applyButton) {
        console.log('📌 投递按钮:', job.applyButton);
        await applyToJob(job);
      } else {
        console.log('❌ 没有投递按钮，跳过');
      }
      
      const delayTime = 2000 + Math.random() * 2000;
      console.log(`⏳ 等待 ${(delayTime / 1000).toFixed(1)} 秒...`);
      await delay(delayTime);
    } else {
      console.log(`⏭️ 匹配度不足，跳过`);
    }
  }
  
  chrome.runtime.sendMessage({ action: 'applyComplete', count: jobs.length });
}

// 提取职位信息
function extractJobs() {
  const jobs = [];
  console.log('🔍 开始提取职位信息...');
  
  // 检查页面上所有可能的职位卡片
  const allElements = document.querySelectorAll('[class*="job"], [class*="Job"]');
  console.log(`📋 找到 ${allElements.length} 个包含job的元素`);
  
  // 更新选择器以匹配Boss直聘实际页面结构
  const selectors = [
    '.job-card-wrapper',
    '.search-job-result .job-card',
    '[data-index]',
    '.job-list li',
    '.job-item',
    '.job-card',
    'div[class*="job-card"]',
    'li[class*="job"]',
    '.search-list li'
  ];
  
  let jobCards = [];
  for (const selector of selectors) {
    const cards = document.querySelectorAll(selector);
    console.log(`🔍 选择器 "${selector}" 找到 ${cards.length} 个元素`);
    if (cards.length > 0) {
      jobCards = Array.from(cards);
      console.log(`✅ 使用选择器: ${selector}`);
      break;
    }
  }

  if (jobCards.length === 0) {
    console.warn('⚠️ 未找到职位卡片，尝试备用方案');
    const titleElements = document.querySelectorAll('.job-name, .job-title');
    console.log(`🔍 找到 ${titleElements.length} 个职位名称元素`);
    titleElements.forEach((titleElement) => {
      const card = titleElement.closest('div, li');
      if (card && !card.querySelector('.match-indicator')) {
        jobCards.push(card);
      }
    });
    console.log(`✅ 通过职位名称找到 ${jobCards.length} 个职位`);
  }

  jobCards.forEach((card, index) => {
    const job = { index };
    
    // 职位标题
    const titleSelectors = ['.job-name', '.job-title', 'h3', 'h4', '[class*="name"]'];
    for (const sel of titleSelectors) {
      const titleElement = card.querySelector(sel);
      if (titleElement) {
        job.title = titleElement.textContent.trim();
        break;
      }
    }

    // 技能标签
    const tagsSelectors = ['.tags', '[class*="tags"]', '.job-tags', '.tag-list'];
    for (const sel of tagsSelectors) {
      const tagsElement = card.querySelector(sel);
      if (tagsElement) {
        job.skills = Array.from(tagsElement.querySelectorAll('span, .tag'))
          .map(tag => tag.textContent.trim()).filter(t => t);
        break;
      }
    }

    // 如果没找到技能标签，尝试其他方式
    if (!job.skills || job.skills.length === 0) {
      const spans = card.querySelectorAll('span');
      job.skills = Array.from(spans)
        .filter(s => s.textContent && s.textContent.length > 1 && s.textContent.length < 15)
        .map(s => s.textContent.trim());
    }

    // 立即沟通按钮 - 使用更多选择器
    const applyBtnSelectors = [
      '.btn-apply', 
      '.btn-startchat', 
      '[ka="btnChat"]', 
      '[class*="btn-chat"]',
      '[class*="btn-apply"]',
      '.start-chat',
      '.im-chat',
      '[class*="chat"]',
      '[class*="沟通"]',
      '[ka*="chat"]',
      'button[class*="btn"]'
    ];
    
    for (const sel of applyBtnSelectors) {
      const applyBtn = card.querySelector(sel);
      if (applyBtn) {
        // 检查按钮文本是否包含"沟通"或"投递"
        if (applyBtn.textContent && (applyBtn.textContent.includes('沟通') || applyBtn.textContent.includes('投递'))) {
          job.applyButton = applyBtn;
          break;
        }
      }
    }
    
    // 如果在卡片内没找到，查找页面上所有包含"立即沟通"的按钮
    if (!job.applyButton && job.title) {
      const allButtons = document.querySelectorAll('button, a');
      for (const btn of allButtons) {
        if (btn.textContent && btn.textContent.includes('立即沟通') && !btn.disabled) {
          if (btn.offsetParent !== null) {
            job.applyButton = btn;
            break;
          }
        }
      }
    }

    if (job.title) {
      jobs.push(job);
      console.log(`📋 职位[${index}]: ${job.title}, 技能: ${job.skills?.join(', ') || '无'}, 有按钮: ${!!job.applyButton}`);
    }
  });
  
  return jobs;
}

// 计算匹配度
function calculateMatchScore(job) {
  console.log('🔢 计算匹配度 - 用户技能:', settings.skills, '职位技能:', job.skills);
  
  if (!settings.skills || settings.skills.length === 0) {
    console.log('⚠️ 用户未设置技能，返回100%');
    return 100;
  }
  
  let score = 0;
  let maxScore = 60;
  
  // 技能匹配（60分）
  if (job.skills && job.skills.length > 0) {
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
    console.log(`🔧 技能匹配: ${matchedSkills}/${settings.skills.length} -> ${score.toFixed(1)}分`);
  } else {
    console.log('⚠️ 职位没有技能标签');
  }
  
  // 职位名称匹配（40分）
  if (settings.targetPosition && job.title) {
    maxScore += 40;
    const keywords = settings.targetPosition.split(/[\s,，、]+/).filter(k => k);
    let matchedKeywords = 0;
    keywords.forEach(keyword => {
      if (job.title.toLowerCase().includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    });
    if (matchedKeywords > 0) {
      score += (matchedKeywords / keywords.length) * 40;
    }
    console.log(`📝 职位匹配: ${matchedKeywords}/${keywords.length} -> ${score.toFixed(1)}分`);
  }
  
  const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
  console.log(`🎯 最终匹配度: ${finalScore}%`);
  return finalScore;
}

// 投递职位 - 核心流程
async function applyToJob(job) {
  try {
    if (!job.applyButton) {
      console.warn('❌ 没有投递按钮');
      return false;
    }
    
    console.log('👆 准备点击立即沟通按钮');
    console.log('按钮元素:', job.applyButton);
    console.log('按钮文本:', job.applyButton.textContent);
    
    // 确保按钮在视口中
    job.applyButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(800);
    
    // 检查按钮是否可见
    const rect = job.applyButton.getBoundingClientRect();
    console.log('按钮位置:', rect);
    
    // 使用多种方式尝试点击
    let clicked = false;
    
    // 方式1: dispatchEvent
    try {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      });
      job.applyButton.dispatchEvent(event);
      console.log('✅ 使用dispatchEvent点击');
      clicked = true;
    } catch (e) {
      console.log('❌ dispatchEvent失败:', e);
    }
    
    // 方式2: 直接click
    if (!clicked) {
      try {
        job.applyButton.click();
        console.log('✅ 使用click方法点击');
        clicked = true;
      } catch (e) {
        console.log('❌ click方法失败:', e);
      }
    }
    
    // 方式3: 使用eval执行点击
    if (!clicked) {
      try {
        const buttonId = job.applyButton.id || 'btn_' + Date.now();
        job.applyButton.id = buttonId;
        window.eval(`document.getElementById('${buttonId}').click()`);
        console.log('✅ 使用eval点击');
        clicked = true;
      } catch (e) {
        console.log('❌ eval方法失败:', e);
      }
    }
    
    if (!clicked) {
      console.error('❌ 所有点击方式都失败');
      return false;
    }
    
    await delay(2500);
    
    // 检查"继续沟通"弹窗
    const continueBtn = findButtonByText('继续沟通');
    if (continueBtn) {
      console.log('👆 找到继续沟通按钮');
      continueBtn.click();
      await delay(2500);
    }
    
    // 检查"留在此页"弹窗
    const stayBtn = findButtonByText('留在此页');
    if (stayBtn) {
      console.log('👆 找到留在此页按钮');
      stayBtn.click();
      await delay(2500);
    }
    
    // 检查"发送"按钮
    const sendBtn = findButtonByText('发送');
    if (sendBtn && sendBtn.closest('[class*="modal"], [class*="popup"], [class*="dialog"]')) {
      console.log('👆 找到发送按钮');
      sendBtn.click();
      await delay(1500);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 投递失败:', error);
    return false;
  }
}

// 查找包含指定文本的按钮
function findButtonByText(text) {
  const buttons = document.querySelectorAll('button, a, [role="button"]');
  console.log(`🔍 查找包含 "${text}" 的按钮，共检查 ${buttons.length} 个元素`);
  
  for (const btn of buttons) {
    if (btn.textContent && btn.textContent.includes(text) && !btn.disabled) {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        console.log(`✅ 找到按钮: "${btn.textContent.trim()}"`);
        return btn;
      }
    }
  }
  console.log(`❌ 未找到包含 "${text}" 的按钮`);
  return null;
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 添加匹配度指示器
function addMatchIndicator() {
  if (!settingsLoaded) {
    console.log('⏳ 设置还未加载完成，稍后再更新匹配度');
    setTimeout(addMatchIndicator, 500);
    return;
  }
  
  console.log('🎨 添加匹配度指示器 - 当前设置:', settings);
  
  // 先移除旧的指示器
  document.querySelectorAll('.match-indicator').forEach(el => el.remove());
  
  const selectors = [
    '.job-card-wrapper',
    '.search-job-result .job-card',
    '[data-index]',
    '.job-list li',
    '.job-card'
  ];
  
  let jobCards = [];
  
  for (const selector of selectors) {
    const cards = document.querySelectorAll(selector);
    if (cards.length > 0) {
      jobCards = Array.from(cards);
      break;
    }
  }
  
  // 备用方案
  if (jobCards.length === 0) {
    const titleElements = document.querySelectorAll('.job-name, .job-title');
    titleElements.forEach((titleElement) => {
      const card = titleElement.closest('div, li');
      if (card) {
        jobCards.push(card);
      }
    });
  }
  
  console.log(`🎨 为 ${jobCards.length} 个职位添加匹配度指示器`);
  
  jobCards.forEach(card => {
    const job = { skills: [] };
    
    const tagsSelectors = ['.tags', '[class*="tags"]', '.job-tags'];
    for (const sel of tagsSelectors) {
      const tagsElement = card.querySelector(sel);
      if (tagsElement) {
        job.skills = Array.from(tagsElement.querySelectorAll('span, .tag'))
          .map(tag => tag.textContent.trim()).filter(t => t);
        break;
      }
    }
    
    // 备用方案获取技能
    if (job.skills.length === 0) {
      const skillSpans = card.querySelectorAll('span');
      job.skills = Array.from(skillSpans)
        .filter(s => s.classList.length > 0 || (s.textContent && s.textContent.length > 1 && s.textContent.length < 15))
        .map(s => s.textContent.trim())
        .filter(t => t);
    }
    
    const titleSelectors = ['.job-name', '.job-title', 'h3', 'h4'];
    for (const sel of titleSelectors) {
      const titleElement = card.querySelector(sel);
      if (titleElement) {
        job.title = titleElement.textContent.trim();
        break;
      }
    }
    
    const matchScore = calculateMatchScore(job);
    const indicator = document.createElement('div');
    indicator.className = 'match-indicator';
    indicator.textContent = `${matchScore}%`;
    
    const color = matchScore >= 80 ? '#52c41a' : matchScore >= 60 ? '#faad14' : '#f5222d';
    indicator.style.cssText = `
      position: absolute; top: 8px; right: 8px;
      background: ${color}; color: white; padding: 3px 8px;
      border-radius: 10px; font-size: 11px; font-weight: 600;
      z-index: 1000; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      pointer-events: none;
    `;
    
    card.style.position = 'relative';
    card.appendChild(indicator);
  });
}

// 页面加载完成后添加匹配度指示器
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOMContentLoaded');
  setTimeout(addMatchIndicator, 1500);
});

// 监听页面变化
const observer = new MutationObserver((mutations) => {
  if (mutations.some(m => m.addedNodes.length > 0)) {
    if (!window.matchIndicatorTimeout) {
      window.matchIndicatorTimeout = setTimeout(() => {
        if (settingsLoaded) {
          addMatchIndicator();
        }
        window.matchIndicatorTimeout = null;
      }, 800);
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });

console.log('✅ Boss直聘AI投递助手初始化完成');

// 暴露到全局方便调试
window.BossAIAgent = {
  settings,
  extractJobs,
  calculateMatchScore,
  addMatchIndicator,
  startAutoApply
};