import { persistArchiveMeta } from './archive-utils.js';

const start = document.getElementById('start');
const more = document.getElementById('more');
const toggleLog = document.getElementById('toggleLog');
const save = document.getElementById('save');
const saveLinks = document.getElementById('saveLinks');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const fill = document.getElementById('fill');
const log = document.getElementById('log');
const chooser = document.getElementById('chooser');
const links = document.getElementById('links');
const preview = document.getElementById('preview');
const filter = document.getElementById('filter');
const hideDuplicates = document.getElementById('hideDuplicates');
const groupByDomain = document.getElementById('groupByDomain');
const selectVisible = document.getElementById('selectVisible');
const copyVisible = document.getElementById('copyVisible');
const resultCount = document.getElementById('resultCount');
let discoveredPages = [];
const selectedUrls = new Set();
const removedUrls = new Set();
let currentCrawlState = null;
let previewedUrl = '';
let previewRequestId = 0;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'website-progress') handleCrawlerMessage({ ...message, type: message.progressType });
});

start.addEventListener('click', () => runCrawl(false));
more.addEventListener('click', () => runCrawl(true));
toggleLog.addEventListener('click', () => {
  log.hidden = !log.hidden;
  toggleLog.textContent = log.hidden ? 'Show log' : 'Hide log';
});

async function runCrawl(resume) {
  start.disabled = true;
  more.disabled = true;
  save.disabled = true;
  progress.style.display = 'block';
  fill.style.width = '0%';
  status.textContent = resume ? 'Crawling more pages without saving files…' : 'Crawling the website without saving files…';
  if (!resume) {
    log.replaceChildren();
    chooser.hidden = true;
    currentCrawlState = null;
    discoveredPages = [];
    selectedUrls.clear();
    removedUrls.clear();
    previewedUrl = '';
    previewRequestId += 1;
    preview.removeAttribute('src');
    preview.srcdoc = previewMessage('Select a discovered page to preview it.');
  }
  try {
    const sourceTabId = Number(new URLSearchParams(location.search).get('sourceTabId'));
    const sourceUrl = new URLSearchParams(location.search).get('sourceUrl') || currentCrawlState?.sourceUrl || '';
    const result = await requestCrawler(
      { action: 'discover-website-request', sourceTabId, sourceUrl, crawlState: resume ? currentCrawlState : null },
      { action: 'discover-website', sourceTabId, sourceUrl, crawlState: resume ? currentCrawlState : null },
      'website-discovered',
      10 * 60 * 1000,
    );
    showChooser(result.pages, result.stats, { append: true, crawlState: result.crawlState, hasMore: result.hasMore });
    start.textContent = 'Restart crawl';
  } catch (error) {
    status.textContent = `Could not crawl the website: ${error.message}`;
  } finally {
    start.disabled = false;
    more.disabled = false;
    save.disabled = false;
  }
}

function handleCrawlerMessage(message) {
  if (message.type === 'website-status') {
    status.textContent = message.text;
    if (message.current && message.maximum) fill.style.width = `${Math.min(98, message.current / message.maximum * 100)}%`;
    const entry = document.createElement('div');
    entry.textContent = message.text;
    log.prepend(entry);
  }
  if (message.type === 'website-page-discovered') showLivePage(message.page);
  if (message.type === 'website-discovered') showChooser(message.pages, message.stats, { crawlState: message.crawlState, hasMore: message.hasMore });
  if (message.type === 'website-done') {
    fill.style.width = '100%';
    status.textContent = `Saved ${message.saved} selected pages in ${message.folderName}. Opening the archive database…`;
    setTimeout(() => { location.href = chrome.runtime.getURL('database.html'); }, 700);
  }
  if (message.type === 'website-error') {
    status.textContent = `Could not continue: ${message.message}`;
    start.disabled = false;
    save.disabled = false;
  }
}

function showChooser(pages, stats = {}, options = {}) {
  const existingUrls = new Set(discoveredPages.map((page) => page.url));
  if (!options.append) {
    discoveredPages = [];
    selectedUrls.clear();
    existingUrls.clear();
  }
  for (const page of pages) {
    if (!existingUrls.has(page.url) && !removedUrls.has(page.url)) {
      discoveredPages.push({ ...page, originalIndex: discoveredPages.length });
      existingUrls.add(page.url);
    }
  }
  currentCrawlState = options.crawlState || null;
  more.hidden = !options.hasMore;
  fill.style.width = '100%';
  const details = [
    `${discoveredPages.length} pages`,
    stats.inspectedLinks === undefined ? null : `${stats.inspectedLinks} links inspected`,
    stats.duplicateLinks ? `${stats.duplicateLinks} duplicates removed` : null,
    stats.externalLinks ? `${stats.externalLinks} external links ignored` : null,
    stats.blockedLinks ? `${stats.blockedLinks} links excluded by crawler rules` : null,
  ].filter(Boolean).join(' · ');
  status.textContent = `Found ${details}. Select the pages you want to save.`;
  chooser.hidden = false;
  renderPages();
}

function showLivePage(page) {
  if (!page || removedUrls.has(page.url) || discoveredPages.some((candidate) => candidate.url === page.url)) return;
  discoveredPages.push({ ...page, originalIndex: discoveredPages.length });
  chooser.hidden = false;
  renderPages();
}

function renderPages() {
  const activeUrl = links.querySelector('.link-row.active input')?.value;
  const needle = filter.value.trim().toLocaleLowerCase();
  const unique = new Set();
  let pages = discoveredPages.filter((page) => {
    const duplicate = unique.has(page.url);
    unique.add(page.url);
    if (hideDuplicates.checked && duplicate) return false;
    return !needle || page.url.toLocaleLowerCase().includes(needle) || page.title.toLocaleLowerCase().includes(needle);
  });
  if (groupByDomain.checked) pages = groupLinksByDomain(pages);
  links.replaceChildren();
  let lastDomain = null;
  pages.forEach((page, index) => {
    const domain = page.hostname || new URL(page.url).hostname;
    if (groupByDomain.checked && domain !== lastDomain) {
      const heading = document.createElement('h2');
      heading.className = 'domain-heading';
      heading.textContent = domain;
      links.append(heading);
      lastDomain = domain;
    }
    const row = document.createElement('div');
    row.className = 'link-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = page.url;
    checkbox.checked = selectedUrls.has(page.url);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedUrls.add(page.url);
      else selectedUrls.delete(page.url);
    });
    const copy = document.createElement('span');
    copy.className = 'link-copy';
    copy.innerHTML = '<strong></strong><small></small>';
    copy.querySelector('strong').textContent = page.title;
    copy.querySelector('small').textContent = page.url;
    const actions = document.createElement('span');
    actions.className = 'link-actions';
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'link-icon';
    openButton.textContent = '↗';
    openButton.title = 'Open in new tab';
    openButton.setAttribute('aria-label', `Open ${page.title} in a new tab`);
    openButton.addEventListener('click', (event) => {
      event.stopPropagation();
      chrome.tabs.create({ url: page.url });
    });
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'link-icon delete';
    deleteButton.textContent = '🗑';
    deleteButton.title = 'Remove link';
    deleteButton.setAttribute('aria-label', `Remove ${page.title} from the results`);
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      selectedUrls.delete(page.url);
      removedUrls.add(page.url);
      discoveredPages = discoveredPages.filter((candidate) => candidate.url !== page.url);
      if (previewedUrl === page.url) previewedUrl = '';
      renderPages();
    });
    const metadataButton = document.createElement('button');
    metadataButton.type = 'button';
    metadataButton.className = 'link-icon metadata';
    metadataButton.textContent = 'ⓘ';
    metadataButton.title = 'View page metadata';
    metadataButton.setAttribute('aria-label', `View metadata for ${page.title}`);
    metadataButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const editor = row.querySelector('.link-metadata-editor');
      editor.hidden = !editor.hidden;
    });
    actions.append(metadataButton, openButton, deleteButton);
    row.append(checkbox, copy, actions);
    row.append(createMetadataEditor(page));
    links.append(row);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
    row.addEventListener('click', () => {
      document.querySelectorAll('.link-row.active').forEach((item) => item.classList.remove('active'));
      row.classList.add('active');
      if (previewedUrl !== page.url) loadPreview(page);
    });
    if (page.url === activeUrl || (!activeUrl && index === 0)) {
      row.classList.add('active');
      if (previewedUrl !== page.url) loadPreview(page);
    }
  });
  resultCount.textContent = `Showing ${pages.length} of ${discoveredPages.length} discovered pages`;
  selectVisible.disabled = pages.length === 0;
  copyVisible.disabled = pages.length === 0;
}

function createMetadataEditor(page) {
  const metadata = page.metadata || {};
  const editor = document.createElement('div');
  editor.className = 'link-metadata-editor';
  editor.hidden = true;
  editor.addEventListener('click', (event) => event.stopPropagation());
  const fields = [
    ['Description', metadata.description],
    ['Keywords', Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords],
    ['Author', metadata.author],
    ['Published', metadata.publishedTime],
    ['Modified', metadata.modifiedTime],
    ['Site', metadata.siteName],
    ['Page type', metadata.type],
    ['Language', metadata.language],
    ['Canonical URL', metadata.canonicalUrl],
    ['Robots', metadata.robots],
  ];
  const populated = fields.filter(([, value]) => String(value || '').trim());
  if (!populated.length) {
    const empty = document.createElement('p');
    empty.textContent = 'This page did not publish any additional metadata.';
    editor.append(empty);
  }
  for (const [labelText, value] of populated) {
    const item = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = labelText;
    const content = document.createElement('span');
    content.textContent = value;
    item.append(label, content);
    editor.append(item);
  }
  return editor;
}

function pageWithMetadata(page) {
  return {
    url: page.url,
    title: String(page.title || page.url).trim(),
    metadata: page.metadata || {},
  };
}

async function loadPreview(page) {
  const requestId = ++previewRequestId;
  previewedUrl = page.url;
  preview.removeAttribute('src');
  preview.srcdoc = previewMessage(`Loading preview for ${page.title || page.url}…`);
  try {
    const response = await chrome.runtime.sendMessage({ action: 'preview-website-url-request', url: page.url });
    if (requestId !== previewRequestId) return;
    if (!response?.ok || !response.result?.html) {
      throw new Error(response?.error || 'The extension could not create a preview.');
    }
    preview.srcdoc = response.result.html;
  } catch (error) {
    if (requestId !== previewRequestId) return;
    preview.srcdoc = previewMessage(
      `Preview unavailable: ${error.message || error}. Use the open-in-new-tab icon to view this page.`,
      true,
    );
  }
}

function previewMessage(message, isError = false) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8fa;color:#263247;font:16px system-ui,sans-serif}
    p{max-width:640px;padding:24px;text-align:center;line-height:1.5;color:${isError ? '#b42318' : '#667085'}}
  </style></head><body><p>${escapeHtml(message)}</p></body></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function groupLinksByDomain(pages) {
  return pages.slice().sort((left, right) => {
    const leftKey = new URL(left.url).hostname.toLocaleLowerCase().split('.').reverse().join('.');
    const rightKey = new URL(right.url).hostname.toLocaleLowerCase().split('.').reverse().join('.');
    return leftKey.localeCompare(rightKey) || left.originalIndex - right.originalIndex;
  });
}

filter.addEventListener('input', renderPages);
hideDuplicates.addEventListener('change', renderPages);
groupByDomain.addEventListener('change', renderPages);

selectVisible.addEventListener('click', () => {
  const visible = [...links.querySelectorAll('.link-row input')];
  const shouldSelect = visible.some((input) => !input.checked);
  visible.forEach((input) => {
    input.checked = shouldSelect;
    if (shouldSelect) selectedUrls.add(input.value);
    else selectedUrls.delete(input.value);
  });
  selectVisible.textContent = shouldSelect ? 'Clear visible' : 'Select visible';
});

copyVisible.addEventListener('click', async () => {
  const visibleUrls = [...links.querySelectorAll('.link-row input')].map((input) => input.value);
  const oldText = copyVisible.textContent;
  try {
    await navigator.clipboard.writeText(visibleUrls.join('\n'));
    copyVisible.textContent = `Copied ${visibleUrls.length}`;
  } catch (_) { copyVisible.textContent = 'Copy failed'; }
  setTimeout(() => { copyVisible.textContent = oldText; }, 1200);
});

saveLinks.addEventListener('click', async () => {
  const selected = discoveredPages.filter((page) => selectedUrls.has(page.url));
  if (!selected.length) { status.textContent = 'Select at least one link to save.'; return; }
  saveLinks.disabled = true;
  try {
    const hostname = new URL(selected[0].url).hostname.replace(/[^a-z0-9._-]+/gi, '_') || 'website';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const contents = selected.map((page) => page.url).join('\n') + '\n';
    const downloadId = await chrome.downloads.download({
      url: `data:text/plain;charset=utf-8,${encodeURIComponent(contents)}`,
      filename: `${hostname}/${hostname}-links-${timestamp}.txt`,
      saveAs: false,
    });
    await persistArchiveMeta(downloadId, {
      archiveType: 'link-list',
      websiteCapture: true,
      websiteFolder: hostname,
      websiteOrigin: new URL(selected[0].url).origin,
      pageTitle: `Saved links for ${hostname}`,
      entryCount: selected.length,
      links: selected.map(pageWithMetadata),
      savedAt: new Date().toISOString(),
    });
    await waitForDownload(downloadId);
    status.textContent = `Saved ${selected.length} links. Opening the database preview…`;
    setTimeout(() => { location.href = chrome.runtime.getURL(`database.html?downloadId=${downloadId}`); }, 500);
  } catch (error) {
    status.textContent = `Could not save the links: ${error.message}`;
  } finally { saveLinks.disabled = false; }
});

save.addEventListener('click', async () => {
  const selected = discoveredPages.filter((page) => selectedUrls.has(page.url)).map(pageWithMetadata);
  if (!selected.length) { status.textContent = 'Select at least one page to save.'; return; }
  save.disabled = true;
  fill.style.width = '0%';
  status.textContent = 'Capturing selected pages…';
  try {
    const result = await requestCrawler(
      { action: 'save-website-selection-request', urls: selected },
      { action: 'save-website-selection', urls: selected },
      'website-done',
      30 * 60 * 1000,
    );
    handleCrawlerMessage({ type: 'website-done', ...result });
  } catch (error) {
    status.textContent = `Could not save the selected pages: ${error.message}`;
    save.disabled = false;
  }
});

function withTimeout(promise, milliseconds) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('The crawler timed out. Reload the extension and try again.')), milliseconds))]);
}

async function requestCrawler(directMessage, portMessage, successType, timeout) {
  try {
    const response = await withTimeout(chrome.runtime.sendMessage(directMessage), timeout);
    if (!response?.ok) throw new Error(response?.error || 'The crawler returned no response.');
    return response.result;
  } catch (directError) {
    if (!isMissingReceiverError(directError)) throw directError;
    try {
      return await withTimeout(requestCrawlerOverPort(portMessage, successType), timeout);
    } catch (portError) {
      if (isMissingReceiverError(portError)) {
        throw new Error('Chrome is still using an older extension session. Reload WebArchive Crawler in chrome://extensions, close this page, and open Website Capture again.');
      }
      throw portError;
    }
  }
}

function requestCrawlerOverPort(message, successType) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let port;
    try { port = chrome.runtime.connect({ name: 'website-archiver' }); }
    catch (error) { reject(error); return; }
    port.onMessage.addListener((response) => {
      if (response.type === successType) {
        settled = true;
        resolve(response);
        port.disconnect();
      } else if (response.type === 'website-error') {
        settled = true;
        reject(new Error(response.message));
        port.disconnect();
      } else {
        handleCrawlerMessage(response);
      }
    });
    port.onDisconnect.addListener(() => {
      if (!settled) reject(new Error(chrome.runtime.lastError?.message || 'The crawler background worker disconnected.'));
    });
    port.postMessage(message);
  });
}

function isMissingReceiverError(error) {
  const message = String(error?.message || error || '');
  return /receiving end does not exist|could not establish connection|extension context invalidated/i.test(message);
}

async function waitForDownload(downloadId) {
  const [item] = await chrome.downloads.search({ id: downloadId });
  if (item?.state === 'complete') return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => { chrome.downloads.onChanged.removeListener(listener); resolve(); }, 10_000);
    const listener = (change) => {
      if (change.id !== downloadId || change.state?.current !== 'complete') return;
      clearTimeout(timeout);
      chrome.downloads.onChanged.removeListener(listener);
      resolve();
    };
    chrome.downloads.onChanged.addListener(listener);
  });
}
