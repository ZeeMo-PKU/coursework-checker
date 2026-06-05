import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright";

const DEFAULT_PORTAL =
  "https://course.pku.edu.cn/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function classifyAssignment(pageTitle, bodyText) {
  const text = `${pageTitle}\n${bodyText}`;
  if (/复查提交历史记录|Review Submission History|提交历史记录/i.test(text)) {
    return "submitted";
  }
  if (/上载作业|Upload Assignment|提交作业/i.test(text)) {
    return "open_or_missing";
  }
  if (/访问已拒绝|Access Denied/i.test(text)) {
    return "access_denied";
  }
  if (/没有要显示的内容|No items/i.test(text)) {
    return "empty";
  }
  return "unknown";
}

function extractSnippets(bodyText) {
  const re =
    /.{0,35}(上载作业|复查提交历史记录|到期日期|截止|提交|尝试|满分|不再可用|访问已拒绝|Quiz|作业|实验|Project|Problem Set).{0,110}/gi;
  return Array.from(bodyText.matchAll(re))
    .map((m) => clean(m[0]))
    .slice(0, 8);
}

async function askHidden(rl, question) {
  const mutableOutput = output;
  const originalWrite = mutableOutput.write;
  mutableOutput.write = function writeHidden(chunk, encoding, callback) {
    const text = String(chunk);
    if (text.includes(question)) {
      return originalWrite.call(this, chunk, encoding, callback);
    }
    return originalWrite.call(this, "*".repeat(text.length), encoding, callback);
  };
  try {
    return await rl.question(question);
  } finally {
    mutableOutput.write = originalWrite;
    output.write("\n");
  }
}

async function maybeLogin(page, username, password) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  const visibleText = clean(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
  if (!/登录|用户名|密码|验证码|login|password/i.test(visibleText)) return;

  const usernameLocators = [
    'input[name="user_id"]',
    'input[name="username"]',
    'input[id*="user" i]',
    'input[type="text"]'
  ];
  const passwordLocators = [
    'input[name="password"]',
    'input[id*="pass" i]',
    'input[type="password"]'
  ];

  for (const selector of usernameLocators) {
    const loc = page.locator(selector).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      await loc.fill(username);
      break;
    }
  }
  for (const selector of passwordLocators) {
    const loc = page.locator(selector).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      await loc.fill(password);
      break;
    }
  }

  const afterFill = clean(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
  if (/验证码|captcha/i.test(afterFill)) {
    console.log("页面需要验证码。请在打开的浏览器里手动完成验证码/登录，然后回到这里按 Enter。");
    const rl = readline.createInterface({ input, output });
    await rl.question("完成登录后按 Enter 继续...");
    rl.close();
    return;
  }

  const submit = page
    .locator('input[type="submit"], button[type="submit"], button, input[type="button"]')
    .filter({ hasText: /登录|Log in|Login|提交/i })
    .first();
  if ((await submit.count()) > 0) {
    await Promise.all([
      page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {}),
      submit.click()
    ]);
  } else {
    await page.keyboard.press("Enter");
  }
}

async function collectCurrentCourses(page) {
  return await page.evaluate(() => {
    const cleanLocal = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const links = Array.from(document.querySelectorAll("a")).map((a) => ({
      text: cleanLocal(a.innerText || a.textContent),
      href: a.href
    }));
    return links
      .filter((link) => /25-26学年第[23]学期/.test(link.text) && /launcher\?type=Course/.test(link.href))
      .map((link) => ({
        name: link.text.replace(/^\S+:\s*/, ""),
        href: link.href
      }));
  });
}

async function scanCourseHome(page, course) {
  await page.goto(course.href, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await sleep(700);
  return await page.evaluate((course) => {
    const cleanLocal = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const links = Array.from(document.querySelectorAll("a")).map((a) => ({
      text: cleanLocal(a.innerText || a.textContent),
      href: a.href
    }));
    const menuLinks = links.filter((link) =>
      /(作业|提交|实验|测验|测试|Quiz|Homework|Assignment|Project|Problem|随堂小测|在线测试|课程作业)/i.test(
        `${link.text} ${link.href}`
      )
    );
    return {
      course,
      title: document.title,
      url: location.href,
      menuLinks
    };
  }, course);
}

async function scanListPage(page, courseName, listLink) {
  await page.goto(listLink.href, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
  await sleep(700);
  return await page.evaluate(
    ({ courseName, listLink }) => {
      const cleanLocal = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const bodyText = cleanLocal(document.body.innerText || "");
      const itemLinks = Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          text: cleanLocal(a.innerText || a.textContent),
          href: a.href
        }))
        .filter((link) => /uploadAssignment|assessment|attempt|作业|提交|Quiz|Problem|Project|实验|第\d+次/i.test(`${link.text} ${link.href}`));
      const assignmentLinks = itemLinks.filter((link) => /uploadAssignment/.test(link.href));
      return {
        courseName,
        label: listLink.text,
        title: document.title,
        url: location.href,
        bodyText,
        assignmentLinks
      };
    },
    { courseName, listLink }
  );
}

async function scanAssignment(page, courseName, assignmentLink) {
  let navigationError = null;
  try {
    await page.goto(assignmentLink.href, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (error) {
    navigationError = error.message;
  }
  await sleep(700);

  return await page.evaluate(
    ({ courseName, assignmentLink, navigationError }) => {
      const cleanLocal = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const bodyText = cleanLocal(document.body.innerText || "");
      const title = document.title;
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5"))
        .map((h) => cleanLocal(h.innerText || h.textContent))
        .filter(Boolean)
        .slice(0, 20);
      const files = Array.from(document.querySelectorAll("a"))
        .map((a) => cleanLocal(a.innerText || a.textContent))
        .filter((text) => /\.(pdf|zip|rar|7z|docx?|py|ipynb|v|sv|md)$/i.test(text))
        .slice(0, 20);
      return {
        courseName,
        name: assignmentLink.text,
        url: location.href,
        requestedUrl: assignmentLink.href,
        navigationError,
        title,
        headings,
        bodyText,
        files
      };
    },
    { courseName, assignmentLink, navigationError }
  );
}

async function summarizeWithOpenAI(apiKey, findings) {
  if (!apiKey) return null;
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const compact = findings.map((item) => ({
    course: item.courseName,
    name: item.name,
    status: item.status,
    snippets: item.snippets
  }));
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "你是课程作业检查助手。只根据输入的扫描结果，用中文简洁总结哪些作业可能未提交、哪些已提交、哪些状态不确定。不要编造。"
      },
      { role: "user", content: JSON.stringify(compact, null, 2) }
    ]
  });
  return response.output_text;
}

function renderMarkdown({ portalUrl, generatedAt, courses, findings, aiSummary }) {
  const missing = findings.filter((item) => item.status === "open_or_missing");
  const submitted = findings.filter((item) => item.status === "submitted");
  const uncertain = findings.filter((item) => !["open_or_missing", "submitted"].includes(item.status));

  const section = (items) =>
    items.length
      ? items
          .map((item) => {
            const snippets = item.snippets.map((s) => `  - ${s}`).join("\n");
            return `- ${item.courseName} / ${item.name}\n  - 状态: ${item.status}\n${snippets || "  - 无摘要"}`;
          })
          .join("\n")
      : "- 无";

  return `# Coursework Check Report

- Generated at: ${generatedAt}
- Portal URL: ${portalUrl}
- Courses scanned: ${courses.length}
- Assignment pages scanned: ${findings.length}

## AI Summary

${aiSummary || "未启用 API Key，总结由规则生成。"}

## Likely Missing Or Open

${section(missing)}

## Submitted

${section(submitted)}

## Uncertain

${section(uncertain)}
`;
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const portalAnswer = await rl.question(`教学网入口 URL [${DEFAULT_PORTAL}]: `);
  const portalUrl = portalAnswer.trim() || DEFAULT_PORTAL;
  const username = await rl.question("教学网账号: ");
  const password = await askHidden(rl, "教学网密码: ");
  const apiKey = await askHidden(rl, "OpenAI API Key（可留空）: ");
  rl.close();

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log("打开教学网...");
  await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await maybeLogin(page, username.trim(), password);
  await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await sleep(1000);

  const courses = await collectCurrentCourses(page);
  console.log(`发现当前课程 ${courses.length} 门。`);

  const courseHomes = [];
  const listPages = [];
  const assignmentLinks = new Map();

  for (const course of courses) {
    console.log(`扫描课程: ${course.name}`);
    const home = await scanCourseHome(page, course);
    courseHomes.push(home);
    for (const link of home.menuLinks) {
      if (/listContent\.jsp/.test(link.href)) {
        const key = `${course.name}|${link.href}`;
        if (!assignmentLinks.has(key)) {
          listPages.push({ courseName: course.name, link });
          assignmentLinks.set(key, true);
        }
      }
    }
  }

  const assignments = new Map();
  for (const listPage of listPages) {
    const data = await scanListPage(page, listPage.courseName, listPage.link);
    for (const link of data.assignmentLinks) {
      const key = `${data.courseName}|${link.href}`;
      if (!assignments.has(key)) assignments.set(key, { courseName: data.courseName, link });
    }
  }

  console.log(`发现作业/测验提交页 ${assignments.size} 个。`);
  const findings = [];
  for (const { courseName, link } of assignments.values()) {
    console.log(`检查: ${courseName} / ${link.text}`);
    const raw = await scanAssignment(page, courseName, link);
    const status = classifyAssignment(raw.title, raw.bodyText);
    findings.push({
      courseName,
      name: raw.name,
      status,
      title: raw.title,
      url: raw.url,
      requestedUrl: raw.requestedUrl,
      navigationError: raw.navigationError,
      headings: raw.headings,
      files: raw.files,
      snippets: extractSnippets(raw.bodyText)
    });
  }

  await fs.mkdir("reports", { recursive: true });
  const generatedAt = new Date().toISOString();
  const jsonPath = path.join("reports", `coursework-${nowStamp()}.json`);
  const mdPath = jsonPath.replace(/\.json$/, ".md");
  let aiSummary = null;
  try {
    aiSummary = await summarizeWithOpenAI(apiKey.trim(), findings);
  } catch (error) {
    aiSummary = `OpenAI 总结失败：${error.message}`;
  }

  const report = { generatedAt, portalUrl, courses, courseHomes, findings, aiSummary };
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(mdPath, renderMarkdown(report), "utf8");

  const missing = findings.filter((item) => item.status === "open_or_missing");
  console.log("\n可能未提交/仍开放的项目：");
  for (const item of missing) {
    console.log(`- ${item.courseName} / ${item.name}`);
    for (const snippet of item.snippets.slice(0, 2)) console.log(`  ${snippet}`);
  }
  if (!missing.length) console.log("- 无");
  console.log(`\n报告已保存：${mdPath}`);
  console.log(`原始数据：${jsonPath}`);
  console.log("浏览器保持打开，方便你复核。关闭浏览器即可结束。");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
