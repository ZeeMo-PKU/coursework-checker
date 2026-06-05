# Coursework Checker / 教学网作业检查器

Local Blackboard coursework checker for PKU course site.

一个本地运行的北大教学网 Blackboard 作业检查工具。它会打开浏览器、登录教学网、扫描当前课程里的作业/测验/实验提交页，并生成“可能未提交”“已提交”“状态不确定”的报告。

## Privacy / 隐私说明

This tool is designed to run on the user's own computer.

本工具设计为只在使用者自己的电脑上运行：

- Teaching-site account and password are entered only in the visible browser login page.
- The browser is visible, so users can handle captcha or multi-factor login manually.
- The tool does not bypass captcha, access controls, or course permissions.
- Reports are saved locally under `reports/`.

中文说明：

- 教学网账号和密码只在可见浏览器登录页中输入，程序不在终端收集账号密码。
- 浏览器会可见，验证码或二次验证需要本人手动完成。
- 程序不会绕过验证码、权限控制或课程访问限制。
- 报告只保存在本地 `reports/` 目录。

## Features / 功能

- Opens PKU Blackboard course portal with Playwright.
- Collects current-semester course links from the portal page.
- Scans course menu entries related to assignments, quizzes, tests, labs, and submissions.
- Checks Blackboard assignment pages using simple status rules.
- Generates Markdown and JSON reports.

中文功能：

- 使用 Playwright 打开北大教学网。
- 从首页收集当前学期课程。
- 扫描课程菜单中的作业、测验、实验、提交入口。
- 根据 Blackboard 页面状态判断是否可能未提交。
- 生成 Markdown 和 JSON 报告。

## Install / 安装

Requirements:

- Node.js 18 or newer
- npm

If you cloned the repository from GitHub:

```powershell
git clone https://github.com/ZeeMo-PKU/coursework-checker.git
cd coursework-checker
npm install
npx playwright install chromium
```

If you are using the local copy on this machine:

```powershell
cd /d C:\Users\贾镕旭\Documents\MyGo\coursework-checker
npm install
npx playwright install chromium
```

中文安装说明：

如果是从 GitHub 克隆：

```powershell
git clone https://github.com/ZeeMo-PKU/coursework-checker.git
cd coursework-checker
npm install
npx playwright install chromium
```

如果是在这台电脑上使用已经创建好的本地目录：

```powershell
cd /d C:\Users\贾镕旭\Documents\MyGo\coursework-checker
npm install
npx playwright install chromium
```

## Run / 运行

```powershell
npm start
```

If `npm` prints `ENOENT Could not read package.json`, you are in the wrong directory. Run `cd` into the repository folder first.

如果看到 `ENOENT Could not read package.json`，说明当前终端目录不在本项目里。先用 `cd` 进入仓库目录，再运行 `npm install` 或 `npm start`。

The program will ask for:

- Course portal URL, press Enter to use the default PKU portal URL

When the terminal stops at `Course portal URL` / `教学网入口 URL`, it is waiting for keyboard input. Press Enter to use the default URL.

程序会提示输入：

- 教学网入口 URL，直接回车使用默认北大教学网入口

当终端停在 `教学网入口 URL` 这一行时，不是卡死，而是在等你输入。直接按 Enter 就会使用默认入口继续。

The checker does not ask for the teaching-site account or password in the terminal. It opens the browser and waits for you to complete account login, QR login, captcha, or multi-factor login manually. After login, return to the terminal and press Enter.

程序不会在终端询问教学网账号或密码。它会打开浏览器，等待你在浏览器里手动完成账号登录、扫码登录、验证码或二次验证。登录完成后，回到终端按 Enter。

On the PKU teaching-site login page, the checker tries to choose `校园卡用户` automatically. If the page layout changes, choose `校园卡用户` manually in the visible browser and continue.

在北大教学网登录页，程序会默认尝试选择 `校园卡用户`。如果页面布局变化导致自动选择失败，请在可见浏览器里手动点击 `校园卡用户`。

If the checker cannot find any courses, it will no longer report "no homework" directly. It will ask you to confirm the browser is logged in and on `我的主页(My Page)` or `北大课程(PKU Courses)`, then press Enter to retry.

如果程序没有发现任何课程，它不会直接报告“无作业”。它会要求你确认浏览器已经登录，并进入 `我的主页(My Page)` 或 `北大课程(PKU Courses)`，然后按 Enter 重试。

## Output / 输出

Reports are written to `reports/`:

- `coursework-*.md`: readable report
- `coursework-*.json`: raw scan data

The terminal and Markdown report show a short `Quick Todo / 快速待办` section first. Detailed page evidence is kept later in the report.

报告会保存到 `reports/`：

- `coursework-*.md`：可读报告
- `coursework-*.json`：原始扫描数据

终端和 Markdown 报告会先显示简短的 `Quick Todo / 快速待办`，详细页面证据放在报告后面。

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
