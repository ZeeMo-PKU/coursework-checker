# Coursework Checker / 教学网作业检查器

Local Blackboard coursework checker for PKU course site.

一个本地运行的北大教学网 Blackboard 作业检查工具。它会打开浏览器、登录教学网、扫描当前课程里的作业/测验/实验提交页，并生成“可能未提交”“已提交”“状态不确定”的报告。

## Privacy / 隐私说明

This tool is designed to run on the user's own computer.

本工具设计为只在使用者自己的电脑上运行：

- Teaching-site account and password are entered locally and are not written to files.
- OpenAI API Key is optional and is not written to files.
- The browser is visible, so users can handle captcha or multi-factor login manually.
- The tool does not bypass captcha, access controls, or course permissions.
- Reports are saved locally under `reports/`.

中文说明：

- 教学网账号和密码只在本地输入，不写入文件。
- OpenAI API Key 可留空，也不会写入文件。
- 浏览器会可见，验证码或二次验证需要本人手动完成。
- 程序不会绕过验证码、权限控制或课程访问限制。
- 报告只保存在本地 `reports/` 目录。

## Features / 功能

- Opens PKU Blackboard course portal with Playwright.
- Collects current-semester course links from the portal page.
- Scans course menu entries related to assignments, quizzes, tests, labs, and submissions.
- Checks Blackboard assignment pages using simple status rules.
- Generates Markdown and JSON reports.
- Optionally uses OpenAI to produce a Chinese summary of the scan results.

中文功能：

- 使用 Playwright 打开北大教学网。
- 从首页收集当前学期课程。
- 扫描课程菜单中的作业、测验、实验、提交入口。
- 根据 Blackboard 页面状态判断是否可能未提交。
- 生成 Markdown 和 JSON 报告。
- 可选使用 OpenAI API 生成中文摘要。

## Install / 安装

Requirements:

- Node.js 18 or newer
- npm

安装依赖：

```powershell
cd coursework-checker
npm install
npx playwright install chromium
```

## Run / 运行

```powershell
npm start
```

The program will ask for:

- Course portal URL, press Enter to use the default PKU portal URL
- Teaching-site account
- Teaching-site password
- OpenAI API Key, optional

程序会提示输入：

- 教学网入口 URL，直接回车使用默认北大教学网入口
- 教学网账号
- 教学网密码
- OpenAI API Key，可留空

If the page requires captcha, complete login in the visible browser window, then return to the terminal and press Enter.

如果出现验证码，请在打开的浏览器窗口中手动完成登录，然后回到终端按 Enter。

## Output / 输出

Reports are written to `reports/`:

- `coursework-*.md`: readable report
- `coursework-*.json`: raw scan data

报告会保存到 `reports/`：

- `coursework-*.md`：可读报告
- `coursework-*.json`：原始扫描数据

## Status Rules / 状态判断规则

The checker uses conservative Blackboard page rules:

- `Review Submission History` or `复查提交历史记录`: treated as submitted.
- `Upload Assignment` or `上载作业`: treated as open or possibly missing.
- `Access Denied` or `访问已拒绝`: treated as uncertain.
- Empty or unusual pages: treated as uncertain.

中文规则：

- 页面出现 `复查提交历史记录`：视为已提交。
- 页面出现 `上载作业`：视为未提交或仍开放。
- 页面出现 `访问已拒绝`：视为状态不确定。
- 空页面或无法识别页面：视为状态不确定。

## Limitations / 限制

Blackboard courses are often configured differently by different instructors. Some homework may be announced in WeChat, email, PDFs, external forms, or courseware instead of Blackboard assignment pages. This tool is a reminder aid, not an official grade or submission record.

不同老师对 Blackboard 的使用方式不同。有些作业可能发布在微信群、邮件、PDF、腾讯文档、课程资料或其他平台，而不是教学网作业提交页。本工具只能作为提醒清单，不能替代课程官方要求或最终提交记录。
