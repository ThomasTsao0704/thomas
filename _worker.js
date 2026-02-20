/**
 * Cloudflare Pages — Advanced Mode Worker
 * 攔截 card.html?id=XXX 請求，伺服器端注入 Open Graph meta 標籤
 * 其餘所有請求直接回傳靜態資源
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 只處理 card.html 且帶有 ?id= 的請求
    if (url.pathname.endsWith('/card.html') && url.searchParams.get('id')) {
      return handleCard(request, env, url);
    }

    // 其餘請求交給 Pages 靜態資源處理
    return env.ASSETS.fetch(request);
  }
};

async function handleCard(request, env, url) {
  const id = url.searchParams.get('id');

  // 同時取得 HTML 與 artisans.json
  const [htmlRes, dataRes] = await Promise.all([
    env.ASSETS.fetch(request),
    env.ASSETS.fetch(new URL('/artisans.json', url.href))
  ]);

  if (!htmlRes.ok) return htmlRes;

  let artisan = null;
  if (dataRes.ok) {
    const data = await dataRes.json();
    artisan = data.artisans.find(a => a.id === id) || null;
  }

  // 找不到職人時直接回傳原始 HTML（顯示 404 頁）
  if (!artisan) return htmlRes;

  // 組合 OG 內容
  const taglineText = artisan.tagline
    .split(/[，,]/)
    .map(s => s.trim())
    .filter(Boolean)
    .join('，');

  const ogTitle = `${artisan.name} | ${artisan.title}`;
  const ogDesc  = `${taglineText} — ${artisan.bio}`;
  const ogImage = artisan.avatar || '';
  const ogUrl   = url.href;

  // 用 HTMLRewriter 在回傳前直接修改 <head> 內容
  return new HTMLRewriter()
    .on('title',                           new TitleRewriter(ogTitle))
    .on('meta[property="og:title"]',       new ContentRewriter(ogTitle))
    .on('meta[property="og:description"]', new ContentRewriter(ogDesc))
    .on('meta[property="og:image"]',       new ContentRewriter(ogImage))
    .on('meta[property="og:url"]',         new ContentRewriter(ogUrl))
    .on('meta[name="description"]',        new ContentRewriter(ogDesc))
    .transform(htmlRes);
}

/** 替換 <title> 文字內容 */
class TitleRewriter {
  constructor(text) {
    this.text = text;
    this.done = false;
  }
  text(chunk) {
    if (!this.done) {
      chunk.replace(this.text);
      this.done = true;
    } else {
      chunk.replace('');
    }
  }
}

/** 替換 <meta> 的 content 屬性 */
class ContentRewriter {
  constructor(content) {
    this.content = content;
  }
  element(el) {
    el.setAttribute('content', this.content);
  }
}
