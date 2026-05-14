# 快速开始

## 安装步骤

### 1. 下载扩展

```bash
# 克隆仓库
git clone https://github.com/your-username/boss-ai-agent.git

# 进入目录
cd boss-ai-agent/extension
```

### 2. 生成图标（可选）

```bash
node generate-icons.js
```

### 3. 安装到浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启 **开发者模式**（右上角开关）
4. 点击 **加载已解压的扩展程序**
5. 选择 `boss-ai-agent/extension` 文件夹

## 使用步骤

1. **打开 Boss直聘**：访问 https://www.zhipin.com
2. **搜索职位**：输入关键词搜索您感兴趣的职位
3. **打开插件**：点击浏览器右上角的紫色"B"图标
4. **配置技能**：选择或输入您的技能标签
5. **设置意向**：填写目标职位、工作经验、期望薪资
6. **编辑模板**：修改自我介绍内容（`{skills}` 将自动替换）
7. **开始投递**：点击"🚀 开始投递"按钮

## 配置示例

### 自我介绍模板

```
您好，我对贵公司的这个职位非常感兴趣！

我具备以下技能：
{skills}

期待能有机会进一步交流！
```

### 技能输入

```
Java, Python, Spring Boot, Vue.js, MySQL, Redis
```

## 调试模式

1. 打开 `chrome://extensions/`
2. 找到插件，点击 **检查视图** → **弹出窗口**
3. 在开发者工具中查看日志和调试信息

## 常见问题

**Q: 插件图标不显示？**

A: 运行 `node generate-icons.js` 重新生成图标，然后重新加载扩展。

**Q: 投递失败？**

A: 请确保已登录 Boss直聘 账号，并检查网络连接。

**Q: 如何更新插件？**

A: 在 GitHub 上拉取最新代码，然后在扩展页面点击刷新按钮。

## 注意事项

- 使用本插件需遵守 Boss直聘 网站使用条款
- 建议控制投递频率，避免账号被限制
- 本插件仅供学习和个人使用

---

更多详情请查看 [README.md](README.md)
