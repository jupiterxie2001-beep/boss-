// Boss直聘AI投递助手 - 后台服务

// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
  console.log('🤖 Boss直聘AI投递助手已安装');
  
  // 初始化设置
  chrome.storage.local.set({
    'boss_ai_settings': {
      skills: [],
      targetPosition: '',
      experience: '',
      salary: '',
      introTemplate: '您好，我对贵公司的这个职位非常感兴趣。我具备以下技能：\n{skills}\n期待能有机会进一步交流！',
      matchMode: 'auto',
      matchThreshold: 60
    },
    'boss_ai_stats': {
      appliedCount: 0,
      successCount: 0,
      matchCount: 0
    }
  });
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'applyComplete') {
    // 投递完成，可以添加通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '投递完成',
      message: `已投递 ${request.appliedCount} 个职位，成功 ${request.successCount} 个`
    });
  }
});

// 监听标签页变化
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('zhipin.com')) {
    // 页面加载完成，注入脚本
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    // 注入样式
    chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['content.css']
    });
  }
});
