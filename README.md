# Boss直聘AI投递助手

一个帮助用户在 Boss 直聘上自动筛选匹配职位并投递的浏览器插件。备注：功能还不能实现，龟速更新中。

## 功能特点

- 🎯 **智能匹配**：根据技能标签计算职位匹配度
- 🚀 **自动投递**：一键批量投递匹配职位
- 💬 **自动沟通**：自动处理沟通弹窗流程

## 使用方法

1. 在 Chrome 浏览器中打开扩展管理页面 (`chrome://extensions/`)
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `extension` 文件夹
5. 在 Boss 直聘职位列表页面点击插件图标
6. 选择技能标签并设置目标职位
7. 点击「开始投递」

## 核心功能流程

1. **筛选匹配职位**：根据用户设置的技能和目标职位计算匹配度
2. **点击立即沟通**：自动点击匹配职位的「立即沟通」按钮
3. **处理弹窗**：自动点击「继续沟通」和「留在此页」按钮
4. **循环投递**：返回职位列表继续投递下一个匹配职位

## 文件结构

```
extension/
├── manifest.json    # 扩展配置文件
├── content.js       # 页面核心功能脚本
├── content.css      # 页面样式
├── popup.html       # 弹窗页面
├── popup.js         # 弹窗脚本
├── background.js    # 后台服务脚本
└── icons/           # 图标文件
```

## 调试

打开浏览器开发者控制台（F12）查看详细日志：
- `BossAIAgent.extractJobs()` - 提取职位信息
- `BossAIAgent.calculateMatchScore(job)` - 计算匹配度
- `BossAIAgent.addMatchIndicator()` - 更新匹配度显示
- `BossAIAgent.startAutoApply()` - 开始自动投递
