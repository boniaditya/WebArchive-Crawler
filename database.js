import { basename, formatBytes, formatDate, loadArchiveMeta, persistArchiveMeta, readDownloadedArchive, removeArchiveMeta } from './archive-utils.js';
import { decodeBplist } from './bplist_decoder.js';
import { parseMHTML } from './mhtml.js';
const content = document.getElementById('content');
const preview = document.getElementById('preview');
const requestedDownloadId = Number(new URLSearchParams(location.search).get('downloadId')) || null;
const shell = document.querySelector('.shell');
const sidebar = document.querySelector('aside');
let databaseRecords = [];
let activePreviewRecord = null;
const capturedLinkDownloads = new Map();
const sidebarToggle = document.createElement('button');
sidebarToggle.type = 'button';
sidebarToggle.className = 'database-sidebar-toggle';
sidebarToggle.setAttribute('aria-controls', 'content');
sidebar.prepend(sidebarToggle);
const addWebsiteBtn = document.createElement('button');
addWebsiteBtn.type = 'button';
addWebsiteBtn.className = 'database-add-website';
addWebsiteBtn.textContent = '+ Add website URL';
sidebar.insertBefore(addWebsiteBtn, document.getElementById('content'));
const searchPanel = document.createElement('section');
searchPanel.className = 'database-search';
searchPanel.innerHTML = `
  <label class="search-main"><span>Search archive database</span><input id="databaseSearch" type="search" placeholder='Search titles, URLs and metadata'></label>
  <div class="search-actions"><button id="advancedSearchToggle" type="button">Advanced search</button><button id="clearDatabaseSearch" type="button">Clear</button></div>
  <div class="advanced-search" id="advancedSearch" hidden>
    <label>Search field<select id="searchField"><option value="all">All fields</option><option value="content">Page content</option><option value="title">Title</option><option value="url">URL</option><option value="description">Description</option><option value="keywords">Keywords</option><option value="author">Author</option><option value="siteName">Site name</option><option value="language">Language</option></select></label>
    <label>Record type<select id="searchType"><option value="all">All saved links</option><option value="link-list">Saved link lists</option></select></label>
    <label>Website<input id="searchWebsite" type="search" placeholder="example.com"></label>
    <label>Saved after<input id="searchAfter" type="date"></label>
    <label>Saved before<input id="searchBefore" type="date"></label>
    <label>Sort<select id="searchSort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="website">Website A–Z</option></select></label>
  </div>
  <p class="search-help" id="searchHelp">Use quotes for phrases or operators such as content:, title:, url:, author:, keyword:, site:, and lang:.</p>
  <p class="search-count" id="searchCount" role="status"></p>`;
sidebar.insertBefore(searchPanel, addWebsiteBtn);
const databaseSearch = document.getElementById('databaseSearch');
const searchField = document.getElementById('searchField');
const searchType = document.getElementById('searchType');
const searchWebsite = document.getElementById('searchWebsite');
const searchAfter = document.getElementById('searchAfter');
const searchBefore = document.getElementById('searchBefore');
const searchSort = document.getElementById('searchSort');
const searchCount = document.getElementById('searchCount');
document.getElementById('advancedSearchToggle').onclick = (event) => {
  const advanced = document.getElementById('advancedSearch');
  advanced.hidden = !advanced.hidden;
  event.currentTarget.textContent = advanced.hidden ? 'Advanced search' : 'Hide advanced';
};
document.getElementById('clearDatabaseSearch').onclick = () => {
  databaseSearch.value = '';
  searchField.value = 'all';
  searchType.value = 'all';
  searchWebsite.value = '';
  searchAfter.value = '';
  searchBefore.value = '';
  searchSort.value = 'newest';
  applyDatabaseSearch();
};
for (const control of [databaseSearch, searchField, searchType, searchWebsite, searchAfter, searchBefore, searchSort]) {
  control.addEventListener(control.tagName === 'SELECT' || control.type === 'date' ? 'change' : 'input', applyDatabaseSearch);
}
const sidebarStyles = document.createElement('style');
sidebarStyles.textContent = `
  .shell { grid-template-columns: 380px minmax(0, 1fr); }
  .database-sidebar-toggle { border:1px solid #d8dbe2; border-radius:8px; padding:9px; background:#fff; color:#344054; cursor:pointer; margin-bottom:16px; font:inherit; }
  .database-add-website { width:100%; padding:10px 12px; border:1px solid #0a7cff; border-radius:9px; background:#fff; color:#0a67c7; font:inherit; font-weight:700; cursor:pointer; margin:4px 0 12px; }
  .database-search { display:grid; gap:8px; margin:14px 0 10px; padding:12px; border:1px solid #d8dbe2; border-radius:12px; background:#f8fafc; }
  .database-search label { display:grid; gap:4px; color:#475467; font-size:11px; font-weight:700; }
  .database-search input,.database-search select { width:100%; min-width:0; padding:8px 9px; border:1px solid #b8c0cc; border-radius:7px; background:#fff; color:#1d1d1f; font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .search-main span { color:#344054; font-size:12px; }
  .search-actions { display:flex; gap:7px; }
  .search-actions button { border:0; background:transparent; color:#0a67c7; padding:2px; cursor:pointer; font:inherit; font-size:12px; font-weight:600; }
  .advanced-search { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .advanced-search[hidden] { display:none; }
  .search-help,.search-count { margin:0; color:#667085; font-size:11px; line-height:1.35; }
  .search-count { color:#344054; font-weight:700; }
  .folder-head { display:flex; align-items:center; gap:8px; }
  .folder-head a { flex:1; min-width:0; }
  .folder-delete { flex:0 0 auto; border:0; background:transparent; padding:3px; font-size:14px; cursor:pointer; }
  .thread-delete { flex:0 0 auto; border:0; background:transparent; padding:3px; font-size:13px; cursor:pointer; }
  .thread { display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; align-items:center; }
  .thread a { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .thread .meta { margin-left:0; }
  .database-sidebar-toggle:focus-visible { outline:3px solid #0a7cff; outline-offset:2px; }
  .link-list-preview { height:100%; overflow:auto; padding:34px; background:#fff; }
  .link-list-preview h2 { margin:0 0 6px; }
  .link-list-preview p { color:#667085; }
  .saved-links { list-style:none; padding:0; margin:24px 0; border:1px solid #d8dbe2; border-radius:12px; overflow:hidden; }
  .saved-links li { padding:12px 14px; border-bottom:1px solid #edf0f3; cursor:pointer; }
  .saved-links li:hover,.saved-links li:focus-visible { background:#f2f8ff; outline:none; }
  .saved-links li:last-child { border-bottom:0; }
  .saved-links a { color:#0a67c7; overflow-wrap:anywhere; }
  .saved-links strong { display:block; margin-bottom:4px; color:#1d1d1f; }
  .search-result-source { display:block; margin-bottom:5px; color:#667085; font-size:11px; }
  .saved-link-metadata { margin:8px 0 0; display:grid; gap:4px; color:#667085; font-size:12px; }
  .saved-link-metadata div { display:grid; grid-template-columns:90px minmax(0,1fr); gap:8px; }
  .saved-link-metadata strong { margin:0; font-size:12px; color:#344054; }
  .link-detail-view { height:100%; overflow:auto; padding:34px; background:#fff; }
  .link-drawer-close { border:1px solid #d8dbe2; border-radius:8px; padding:7px 10px; margin-bottom:22px; background:#fff; color:#344054; cursor:pointer; }
  .link-detail-view h2 { margin:0 0 7px; font-size:22px; line-height:1.25; }
  .link-detail-url { display:block; margin-bottom:14px; color:#0a67c7; overflow-wrap:anywhere; }
  .link-detail-view h3 { margin:22px 0 10px; font-size:14px; }
  .link-capture-actions { display:flex; flex-wrap:nowrap; gap:8px; overflow-x:auto; padding:2px 0 5px; }
  .link-capture-actions button { flex:1 1 0; min-width:145px; padding:10px 12px; border:1px solid #8bbdf0; border-radius:9px; background:#fff; color:#0a67c7; cursor:pointer; font:600 13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; white-space:nowrap; }
  .link-capture-actions button:hover { background:#f2f8ff; }
  .link-capture-actions button.is-active { border-color:#0a67c7; background:#eaf3ff; box-shadow:inset 0 0 0 1px #0a67c7; }
  .link-capture-actions button:disabled { cursor:wait; opacity:.55; }
  .link-capture-status { min-height:20px; margin:7px 0 0; color:#475467; font-size:12px; line-height:1.4; }
  .preview .link-detail-preview { display:block; width:100%; height:calc(100dvh - 320px); min-height:600px; border:1px solid #d8dbe2; border-radius:12px; background:#fff; }
  .link-preview-section[hidden] { display:none; }
  .link-preview-placeholder { display:grid; place-items:center; width:100%; min-height:260px; border:1px dashed #b8c0cc; border-radius:12px; color:#667085; background:#f8fafc; text-align:center; }
  .link-detail-metadata { padding:12px; border:1px solid #e1e5eb; border-radius:10px; background:#f8fafc; }
  .shell.database-collapsed { grid-template-columns:64px minmax(0, 1fr); }
  .shell.database-collapsed aside { padding:16px 8px; }
  .shell.database-collapsed aside > :not(.database-sidebar-toggle) { display:none; }
  .shell.database-collapsed .preview { display:block; }
  @media(max-width:800px) { .shell:not(.database-collapsed) { grid-template-columns:1fr; } }
`;
document.head.append(sidebarStyles);
function setSidebarCollapsed(collapsed) {
  shell.classList.toggle('database-collapsed', collapsed);
  sidebarToggle.textContent = collapsed ? '☰' : '‹ Collapse sidebar';
  sidebarToggle.setAttribute('aria-label', collapsed ? 'Expand database sidebar' : 'Collapse database sidebar');
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  sidebarToggle.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
}
setSidebarCollapsed(localStorage.getItem('database-sidebar-collapsed') === 'true');
sidebarToggle.onclick = () => {
  const collapsed = !shell.classList.contains('database-collapsed');
  setSidebarCollapsed(collapsed);
  localStorage.setItem('database-sidebar-collapsed', String(collapsed));
};
addWebsiteBtn.onclick = async () => {
  const input = prompt('Enter the website URL to capture.');
  if (!input?.trim()) return;
  try {
    const url = new URL(input.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS URL.');
    const source = await chrome.tabs.create({ url: url.href, active: false });
    const params = new URLSearchParams({ sourceTabId: String(source.id), sourceUrl: url.href });
    await chrome.tabs.create({ url: chrome.runtime.getURL(`website-archive.html?${params}`) });
  } catch (error) { alert(`Could not add website: ${error.message}`); }
};

loadDatabase();
async function loadDatabase() {
  try {
    const [items, meta] = await Promise.all([chrome.downloads.search({ state: 'complete', orderBy: ['-startTime'], limit: 0 }), loadArchiveMeta()]);
    capturedLinkDownloads.clear();
    for (const item of items) {
      const data = meta[String(item.id)] || {};
      if (['text', 'mhtml', 'webarchive'].includes(data.archiveType) && data.pageUrl) {
        const captureKey = `${data.archiveType}:${data.pageUrl}`;
        if (!capturedLinkDownloads.has(captureKey)) capturedLinkDownloads.set(captureKey, item.id);
      }
    }
    const groups = new Map();
    for (const item of items.filter((entry) => {
      const data = meta[String(entry.id)] || {};
      return data.archiveType === 'link-list';
    })) {
      const data = meta[String(item.id)] || {};
      const url = data.websiteOrigin || data.pageUrl || 'Unassigned website';
      if (!groups.has(url)) groups.set(url, []);
      groups.get(url).push({ item, data });
    }
    databaseRecords = [];
    content.replaceChildren();
    if (!groups.size) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'No saved website link collections yet.'; content.append(empty); return; }
    let requestedRow = null;
    for (const [url, threads] of groups) {
      const folder = document.createElement('section'); folder.className = 'folder'; folder.dataset.website = url;
      const head = document.createElement('div'); head.className = 'folder-head';
      const link = document.createElement('a'); link.href = url.startsWith('http') ? url : '#'; link.target = '_blank'; link.rel = 'noopener'; link.textContent = url;
      const deleteFolder = document.createElement('button'); deleteFolder.type = 'button'; deleteFolder.className = 'folder-delete'; deleteFolder.textContent = '🗑'; deleteFolder.title = 'Delete all contents of this folder'; deleteFolder.setAttribute('aria-label', `Delete all archived files for ${url}`);
      deleteFolder.onclick = async () => {
        if (!confirm(`Delete all ${threads.length} archived file${threads.length === 1 ? '' : 's'} for ${url} from disk and history?`)) return;
        deleteFolder.disabled = true;
        for (const { item } of threads) {
          try { if (item.exists !== false) await chrome.downloads.removeFile(item.id); } catch (_) {}
          await chrome.downloads.erase({ id: item.id });
          await removeArchiveMeta(item.id);
        }
        if (folder.querySelector('.thread.selected')) preview.innerHTML = '<div class="preview-placeholder">Select a saved archive.</div>';
        databaseRecords = databaseRecords.filter((record) => record.folder !== folder);
        folder.remove();
        applyDatabaseSearch();
        if (!content.querySelector('.folder')) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'No captured website archives have been saved yet.'; content.append(empty); }
      };
      head.append(link, deleteFolder); folder.append(head);
      for (const { item, data } of threads) {
        const row = document.createElement('div'); row.className = 'thread';
        const isLinkList = data.archiveType === 'link-list';
        const isViewerArchive = ['webarchive', 'zarc'].includes(data.archiveType) || /\.(webarchive|zarc)$/i.test(item.filename || '');
        const icon = document.createElement('span'); icon.textContent = isLinkList ? '🔗' : data.archiveType === 'text' ? '📝' : data.archiveType === 'mhtml' ? '🌐' : data.websiteCapture ? '📄' : '🧵';
        const bundle = document.createElement('a'); bundle.href = isViewerArchive ? chrome.runtime.getURL(`viewer.html?downloadId=${item.id}`) : '#'; bundle.textContent = data.bundleTitle || data.pageTitle || basename(item.filename || 'archive.webarchive');
        bundle.onclick = (event) => event.preventDefault();
        const details = document.createElement('span'); details.className = 'meta';
        const tagText = Array.isArray(data.tags) && data.tags.length ? ` · ${data.tags.join(', ')}` : '';
        const siteText = data.pageMetadata?.siteName ? ` · ${data.pageMetadata.siteName}` : '';
        details.textContent = `${data.entryCount ? `${data.entryCount} pages · ` : ''}${formatBytes(item.fileSize || item.bytesReceived || 0)} · ${formatDate(item.startTime)}${siteText}${tagText}`;
        if (data.notes) row.title = data.notes;
        const record = {
          item,
          data,
          website: url,
          title: bundle.textContent,
          type: data.archiveType || (String(item.filename || '').toLocaleLowerCase().endsWith('.zarc') ? 'zarc' : 'webarchive'),
          date: new Date(data.savedAt || item.startTime || 0),
          row,
          folder,
        };
        record.searchFields = buildRecordSearchFields(record);
        row._databaseRecord = record;
        databaseRecords.push(record);
        const deleteThread = document.createElement('button'); deleteThread.type = 'button'; deleteThread.className = 'thread-delete'; deleteThread.textContent = '🗑'; deleteThread.title = 'Delete this archive'; deleteThread.setAttribute('aria-label', `Delete ${bundle.textContent}`);
        deleteThread.onclick = async (event) => {
          event.stopPropagation();
          if (!confirm(`Delete ${bundle.textContent} from disk and history?`)) return;
          deleteThread.disabled = true;
          try { if (item.exists !== false) await chrome.downloads.removeFile(item.id); } catch (_) {}
          await chrome.downloads.erase({ id: item.id });
          await removeArchiveMeta(item.id);
          if (row.classList.contains('selected')) preview.innerHTML = '<div class="preview-placeholder">Select a saved archive.</div>';
          databaseRecords = databaseRecords.filter((record) => record.row !== row);
          row.remove();
          if (!folder.querySelector('.thread')) folder.remove();
          applyDatabaseSearch();
          if (!content.querySelector('.folder')) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'No captured website archives have been saved yet.'; content.append(empty); }
        };
        row.append(icon, bundle, details, deleteThread); folder.append(row);
        row.addEventListener('click', () => {
          content.querySelectorAll('.thread.selected').forEach((element) => element.classList.remove('selected'));
          row.classList.add('selected');
          activePreviewRecord = record;
          if (isLinkList) renderLinkListPreview(data, bundle.textContent);
          else if (isViewerArchive) {
            preview.replaceChildren();
            const frame = document.createElement('iframe');
            frame.src = bundle.href;
            frame.title = `Preview of ${bundle.textContent}`;
            preview.append(frame);
          } else chrome.downloads.open(item.id);
        });
        if (requestedDownloadId === item.id) requestedRow = row;
      }
      content.append(folder);
    }
    applyDatabaseSearch();
    requestedRow?.click();
  } catch (error) { content.textContent = `Could not load the archive database: ${error.message}`; content.className = 'error'; }
}

function buildRecordSearchFields(record) {
  const pageMetadata = record.data.pageMetadata || {};
  const linkEntries = Array.isArray(record.data.links) ? record.data.links : [];
  const linkValues = (field) => linkEntries.map((entry) => {
    const value = typeof entry === 'string' ? { url: entry } : entry || {};
    if (field === 'title') return value.title;
    if (field === 'url') return `${value.url || ''} ${value.metadata?.canonicalUrl || ''}`;
    return value.metadata?.[field];
  });
  const fields = {
    title: [record.title, record.data.pageTitle, record.data.bundleTitle, ...linkValues('title')],
    url: [record.website, record.data.pageUrl, ...linkValues('url')],
    description: [pageMetadata.description, ...linkValues('description')],
    keywords: [pageMetadata.keywords, ...linkValues('keywords')],
    author: [pageMetadata.author, ...linkValues('author')],
    siteName: [pageMetadata.siteName, ...linkValues('siteName')],
    language: [pageMetadata.language, ...linkValues('language')],
    content: [pageMetadata.searchText, ...linkValues('searchText')],
  };
  for (const [key, values] of Object.entries(fields)) fields[key] = searchableText(values);
  fields.all = searchableText([record.item.filename, record.type, record.data, ...Object.values(fields)]);
  return fields;
}

function searchableText(value) {
  const values = Array.isArray(value) ? value.flat(Infinity) : [value];
  return values.map((item) => {
    if (item === undefined || item === null) return '';
    if (typeof item === 'object') {
      try { return JSON.stringify(item); } catch (_) { return ''; }
    }
    return String(item);
  }).join(' ').toLocaleLowerCase();
}

function parseSearchTerms(query) {
  const terms = [];
  const pattern = /(?:([a-z]+):)?(?:"([^"]+)"|(\S+))/gi;
  for (const match of query.matchAll(pattern)) {
    terms.push({ operator: (match[1] || '').toLocaleLowerCase(), value: (match[2] || match[3] || '').toLocaleLowerCase() });
  }
  return terms.filter((term) => term.value);
}

function recordMatchesText(record, terms, selectedField = 'all') {
  const operatorFields = { content: 'content', title: 'title', url: 'url', author: 'author', keyword: 'keywords', keywords: 'keywords', site: 'siteName', lang: 'language', language: 'language' };
  return terms.every(({ operator, value }) => {
    if (operator === 'type') return record.type.toLocaleLowerCase().includes(value);
    const field = operatorFields[operator] || selectedField;
    return (record.searchFields[field] || record.searchFields.all).includes(value);
  });
}

function applyDatabaseSearch() {
  if (!databaseRecords.length) { searchCount.textContent = ''; return; }
  const terms = parseSearchTerms(databaseSearch.value.trim());
  const website = searchWebsite.value.trim().toLocaleLowerCase();
  const after = searchAfter.value;
  const before = searchBefore.value;
  let visible = 0;
  for (const record of databaseRecords) {
    const date = Number.isNaN(record.date.getTime()) ? '' : record.date.toISOString().slice(0, 10);
    let matches = (searchType.value === 'all' || record.type === searchType.value)
      && (!website || record.website.toLocaleLowerCase().includes(website))
      && (!after || (date && date >= after))
      && (!before || (date && date <= before))
      && recordMatchesText(record, terms, searchField.value);
    if (matches && record.type === 'link-list' && terms.length) {
      matches = filterSavedLinkEntries(record.data.links || [], record.title).length > 0;
    }
    record.row.hidden = !matches;
    if (matches) visible += 1;
  }
  for (const folder of content.querySelectorAll('.folder')) {
    folder.hidden = ![...folder.querySelectorAll('.thread')].some((row) => !row.hidden);
    const records = databaseRecords.filter((record) => record.folder === folder);
    records.sort(compareDatabaseRecords).forEach((record) => folder.append(record.row));
  }
  if (searchSort.value === 'website') {
    [...content.querySelectorAll('.folder')].sort((left, right) => left.dataset.website.localeCompare(right.dataset.website)).forEach((folder) => content.append(folder));
  }
  const resultCount = countVisibleSearchResults();
  searchCount.textContent = `${resultCount} matching item${resultCount === 1 ? '' : 's'} in ${visible} saved record${visible === 1 ? '' : 's'}`;
  if (databaseSearchIsActive()) renderDatabaseSearchResults();
  else if (activePreviewRecord?.type === 'link-list') renderLinkListPreview(activePreviewRecord.data, activePreviewRecord.title);
}

function databaseSearchIsActive() {
  return Boolean(databaseSearch.value.trim() || searchWebsite.value.trim() || searchAfter.value || searchBefore.value || searchType.value !== 'all' || searchField.value !== 'all');
}

function countVisibleSearchResults() {
  let count = 0;
  for (const record of databaseRecords.filter((value) => !value.row.hidden)) {
    if (record.type === 'link-list') count += filterSavedLinkEntries(record.data.links || [], record.title).length;
    else count += 1;
  }
  return count;
}

function renderDatabaseSearchResults() {
  preview.replaceChildren();
  const panel = document.createElement('article');
  panel.className = 'link-list-preview database-search-results';
  const heading = document.createElement('h2');
  heading.textContent = 'Archive search results';
  const results = [];
  for (const record of databaseRecords.filter((value) => !value.row.hidden)) {
    if (record.type === 'link-list') {
      for (const entry of filterSavedLinkEntries(record.data.links || [], record.title)) results.push({ entry, record });
    } else results.push({ record });
  }
  const summary = document.createElement('p');
  summary.textContent = `${results.length} matching URL${results.length === 1 ? '' : 's'} or archive page${results.length === 1 ? '' : 's'}`;
  const list = document.createElement('ul');
  list.className = 'saved-links';
  for (const result of results) {
    if (result.entry) {
      const item = createSavedLinkItem(result.entry, result.record);
      if (!item) continue;
      const source = document.createElement('small');
      source.className = 'search-result-source';
      source.textContent = `Saved in ${result.record.title}`;
      item.prepend(source);
      list.append(item);
    } else {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = result.record.title;
      const link = document.createElement('a');
      const viewerSupported = ['webarchive', 'zarc'].includes(result.record.type);
      link.href = viewerSupported ? chrome.runtime.getURL(`viewer.html?downloadId=${result.record.item.id}`) : (result.record.data.pageUrl || '#');
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = result.record.data.pageUrl || result.record.item.filename;
      item.append(name, link);
      appendPageMetadata(item, result.record.data.pageMetadata);
      list.append(item);
    }
  }
  if (!results.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No URLs or metadata matched this search.';
    panel.append(heading, summary, empty);
  } else panel.append(heading, summary, list);
  preview.append(panel);
}

function compareDatabaseRecords(left, right) {
  if (searchSort.value === 'title') return left.title.localeCompare(right.title);
  if (searchSort.value === 'oldest') return left.date - right.date;
  if (searchSort.value === 'website') return left.website.localeCompare(right.website) || left.title.localeCompare(right.title);
  return right.date - left.date;
}

function renderLinkListPreview(data, title) {
  preview.replaceChildren();
  const panel = document.createElement('article');
  panel.className = 'link-list-preview';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const summary = document.createElement('p');
  const allEntries = Array.isArray(data.links) ? data.links : [];
  const entries = filterSavedLinkEntries(allEntries, title);
  summary.textContent = `${entries.length}${entries.length !== allEntries.length ? ` of ${allEntries.length}` : ''} saved link${allEntries.length === 1 ? '' : 's'} · No offline page copies`;
  const list = document.createElement('ul');
  list.className = 'saved-links';
  for (const entry of entries) {
    const item = createSavedLinkItem(entry, activePreviewRecord);
    if (item) list.append(item);
  }
  panel.append(heading, summary, list);
  preview.append(panel);
}

function createSavedLinkItem(entry, record = null) {
  const value = typeof entry === 'string' ? { title: '', url: entry } : entry;
  if (!value?.url) return null;
  const item = document.createElement('li');
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', `View details and capture actions for ${value.title || value.url}`);
  if (value.title && value.title !== value.url) {
    const name = document.createElement('strong');
    name.textContent = value.title;
    item.append(name);
  }
  const link = document.createElement('a');
  link.href = value.url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = value.url;
  link.addEventListener('click', (event) => {
    event.preventDefault();
  });
  item.append(link);
  item.addEventListener('click', () => openLinkDetails(value, record));
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLinkDetails(value, record);
    }
  });
  return item;
}

function openLinkDetails(entry, record = null) {
  const value = typeof entry === 'string' ? { title: '', url: entry, metadata: {} } : entry || {};
  if (!value.url) return;
  const detailView = document.createElement('article');
  detailView.className = 'link-detail-view';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'link-drawer-close';
  close.textContent = '‹ Back to links';
  close.onclick = () => {
    if (databaseSearchIsActive()) renderDatabaseSearchResults();
    else if (activePreviewRecord?.type === 'link-list') renderLinkListPreview(activePreviewRecord.data, activePreviewRecord.title);
    else preview.innerHTML = '<div class="preview-placeholder">Select a saved archive.</div>';
  };
  const heading = document.createElement('h2');
  heading.textContent = value.title || value.url;
  const url = document.createElement('a');
  url.className = 'link-detail-url';
  url.href = value.url;
  url.target = '_blank';
  url.rel = 'noopener';
  url.textContent = value.url;
  const captureMetadata = document.createElement('button');
  captureMetadata.type = 'button';
  captureMetadata.className = 'link-capture-metadata';
  captureMetadata.textContent = 'Capture metadata';
  const status = document.createElement('p');
  status.className = 'link-capture-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  const previewHeading = document.createElement('h3');
  previewHeading.textContent = 'Page preview';
  const previewSection = document.createElement('section');
  previewSection.className = 'link-preview-section';
  previewSection.hidden = true;
  const pagePreview = document.createElement('iframe');
  pagePreview.className = 'link-detail-preview';
  pagePreview.title = `Preview of ${value.title || value.url}`;
  pagePreview.setAttribute('sandbox', '');
  pagePreview.referrerPolicy = 'no-referrer';
  pagePreview.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{display:grid;place-items:center;min-height:90vh;margin:0;font:15px system-ui;color:#667085;background:#f8fafc}p{text-align:center}</style><p>Choose Live preview or a captured version above.</p>';
  previewSection.append(previewHeading, pagePreview);
  const actions = document.createElement('div');
  actions.className = 'link-capture-actions';
  actions.setAttribute('role', 'tablist');
  const activatePanel = (panel, activeButton = null) => {
    previewSection.hidden = panel !== 'preview';
    metadataSection.hidden = panel !== 'metadata';
    status.hidden = panel !== 'preview';
    if (panel !== 'preview') status.textContent = '';
    for (const candidate of actions.querySelectorAll('button')) {
      const active = candidate === activeButton;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-selected', String(active));
    }
    if (panel === 'preview') requestAnimationFrame(() => sizeLinkDetailPreview(pagePreview));
  };
  actions.append(captureMetadata);
  for (const [format, label] of [['text', 'Capture text version'], ['mhtml', 'Capture MHTML version'], ['webarchive', 'Capture WebArchive version']]) {
    const button = document.createElement('button');
    button.type = 'button';
    const existing = databaseRecords.find((candidate) => candidate.type === format && candidate.data?.pageUrl === value.url);
    const cachedDownloadId = capturedLinkDownloads.get(`${format}:${value.url}`);
    setCaptureButtonState(button, value, format, label, cachedDownloadId || existing?.item?.id, actions, status, pagePreview, activatePanel);
    actions.append(button);
  }
  const livePreview = document.createElement('button');
  livePreview.type = 'button';
  livePreview.textContent = 'Live preview';
  livePreview.onclick = () => {
    activatePanel('preview', livePreview);
    loadLinkDetailPreview(value.url, pagePreview, status);
  };
  actions.append(livePreview);
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'link-open-source';
  open.textContent = 'Open live page in new tab';
  open.onclick = () => {
    activatePanel(null, open);
    chrome.tabs.create({ url: value.url });
  };
  actions.append(open);
  const metadataHeading = document.createElement('h3');
  metadataHeading.textContent = 'Page metadata';
  const metadataSection = document.createElement('section');
  metadataSection.className = 'link-metadata-section';
  metadataSection.hidden = true;
  const metadata = document.createElement('div');
  metadata.className = 'link-detail-metadata';
  appendPageMetadata(metadata, value.metadata);
  if (!metadata.childElementCount) metadata.textContent = 'No additional metadata was stored for this link.';
  metadataSection.append(metadataHeading, metadata);
  setMetadataButtonState(captureMetadata, value, record, heading, metadata, status, activatePanel);
  detailView.append(close, heading, url, actions, status, previewSection, metadataSection);
  preview.replaceChildren(detailView);
  close.focus();
}

function sizeLinkDetailPreview(frame) {
  const top = Math.max(0, frame.getBoundingClientRect().top);
  frame.style.height = `${Math.max(600, window.innerHeight - top - 20)}px`;
}

function setMetadataButtonState(button, entry, record, heading, metadataPanel, status, activatePanel) {
  if (entry.metadataCaptured) {
    button.textContent = 'View metadata';
    button.onclick = () => {
      activatePanel('metadata', button);
      metadataPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    return;
  }
  button.textContent = 'Capture metadata';
  button.onclick = () => {
    activatePanel('metadata', button);
    refreshLinkMetadata(entry, record, heading, metadataPanel, button, status, activatePanel);
  };
}

function setCaptureButtonState(button, entry, format, captureLabel, downloadId, actions, status, frame, activatePanel) {
  if (Number.isInteger(downloadId) && downloadId > 0) {
    const label = format === 'text' ? 'text' : format === 'mhtml' ? 'MHTML' : 'WebArchive';
    button.textContent = `View ${label} version`;
    button.onclick = () => {
      activatePanel('preview', button);
      loadCapturedLinkPreview(downloadId, format, frame, status);
    };
    return;
  }
  button.textContent = captureLabel;
  button.onclick = () => {
    activatePanel(null, button);
    captureLinkVersion(entry, format, actions, status, button, frame, activatePanel);
  };
}

async function loadLinkDetailPreview(url, frame, status) {
  status.hidden = false;
  const requestToken = crypto.randomUUID();
  frame.dataset.requestToken = requestToken;
  frame.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{display:grid;place-items:center;min-height:90vh;margin:0;font:15px system-ui;color:#667085;background:#f8fafc}</style><p>Loading page preview…</p>';
  try {
    const response = await chrome.runtime.sendMessage({ action: 'preview-website-url-request', url });
    if (!response?.ok || !response.result?.html) throw new Error(response?.error || 'The preview could not be created.');
    if (frame.dataset.requestToken !== requestToken) return;
    frame.srcdoc = response.result.html;
    frame.title = `Preview of ${response.result.title || url}`;
    status.textContent = 'Viewing live preview.';
  } catch (error) {
    if (frame.dataset.requestToken !== requestToken) return;
    const message = String(error?.message || error || 'The preview could not be created.')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    frame.srcdoc = `<!doctype html><meta charset="utf-8"><style>body{display:grid;place-items:center;min-height:90vh;margin:0;font:15px system-ui;color:#667085;background:#f8fafc}p{max-width:520px;text-align:center}</style><p>${message}<br>Use “Open live page in new tab” to view the website.</p>`;
    status.textContent = `Could not load the preview: ${error?.message || error}`;
  }
}

async function refreshLinkMetadata(entry, record, heading, metadataPanel, button, status, activatePanel) {
  button.disabled = true;
  status.hidden = false;
  status.textContent = 'Fetching metadata from the live page…';
  try {
    const response = await chrome.runtime.sendMessage({ action: 'capture-link-metadata-request', url: entry.url });
    if (!response?.ok) throw new Error(response?.error || 'Metadata capture did not complete.');
    entry.title = response.result.title || entry.title;
    entry.metadata = response.result.metadata || {};
    entry.metadataCaptured = true;
    heading.textContent = entry.title || entry.url;
    metadataPanel.replaceChildren();
    appendPageMetadata(metadataPanel, entry.metadata);
    if (!metadataPanel.childElementCount) metadataPanel.textContent = 'The live page did not publish additional metadata.';
    if (record?.data && Number.isInteger(record.item?.id)) {
      const savedIndex = Array.isArray(record.data.links) ? record.data.links.findIndex((candidate) => (typeof candidate === 'string' ? candidate : candidate?.url) === entry.url) : -1;
      if (savedIndex >= 0) {
        const savedEntry = record.data.links[savedIndex];
        record.data.links[savedIndex] = typeof savedEntry === 'string'
          ? { url: entry.url, title: entry.title, metadata: entry.metadata, metadataCaptured: true }
          : { ...savedEntry, title: entry.title, metadata: entry.metadata, metadataCaptured: true };
      }
      record.searchFields = buildRecordSearchFields(record);
      await persistArchiveMeta(record.item.id, record.data);
    }
    status.textContent = 'Metadata captured and saved to this link.';
    setMetadataButtonState(button, entry, record, heading, metadataPanel, status, activatePanel);
    activatePanel('metadata', button);
    metadataPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    status.textContent = `Could not capture metadata: ${error.message || error}`;
  } finally { button.disabled = false; }
}

async function captureLinkVersion(entry, format, actions, status, captureButton, frame, activatePanel) {
  const buttons = [...actions.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  status.hidden = false;
  const label = format === 'text' ? 'text' : format === 'mhtml' ? 'MHTML' : 'WebArchive';
  status.textContent = `Capturing ${label} version…`;
  try {
    const response = await chrome.runtime.sendMessage({ action: 'capture-link-format-request', url: entry.url, format, metadata: entry.metadata || {} });
    if (!response?.ok) throw new Error(response?.error || 'The capture did not complete.');
    status.textContent = `Saved ${response.result.filename}`;
    capturedLinkDownloads.set(`${format}:${entry.url}`, response.result.downloadId);
    setCaptureButtonState(captureButton, entry, format, captureButton.textContent, response.result.downloadId, actions, status, frame, activatePanel);
    activatePanel('preview', captureButton);
    await loadCapturedLinkPreview(response.result.downloadId, format, frame, status);
  } catch (error) {
    status.textContent = `Could not capture this page: ${error.message || error}`;
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function loadCapturedLinkPreview(downloadId, format, frame, status) {
  status.hidden = false;
  const requestToken = crypto.randomUUID();
  frame.dataset.requestToken = requestToken;
  status.textContent = `Loading captured ${format === 'mhtml' ? 'MHTML' : format === 'webarchive' ? 'WebArchive' : 'text'} version…`;
  try {
    const [item] = await chrome.downloads.search({ id: downloadId });
    if (!item) throw new Error('The captured download could not be found.');
    const bytes = new Uint8Array(await readDownloadedArchive(item));
    if (frame.dataset.requestToken !== requestToken) return;
    if (format === 'text') {
      const text = new TextDecoder('utf-8').decode(bytes);
      frame.srcdoc = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#1d2939;background:#fff}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><pre>${escapePreviewHtml(text)}</pre>`;
    } else if (format === 'mhtml') {
      const parts = parseMHTML(new TextDecoder('utf-8').decode(bytes));
      const main = parts.find((part) => /html/i.test(part.mimeType)) || parts[0];
      if (!main) throw new Error('The MHTML capture has no previewable page.');
      frame.srcdoc = patchCapturedHtml(new TextDecoder(main.charset || 'utf-8').decode(main.data), main.url, parts.filter((part) => part !== main));
    } else {
      const plist = decodeBplist(bytes);
      const main = plist.WebMainResource;
      if (!main?.WebResourceData) throw new Error('The WebArchive capture has no previewable page.');
      frame.srcdoc = patchCapturedHtml(new TextDecoder(main.WebResourceTextEncodingName || 'utf-8').decode(main.WebResourceData), main.WebResourceURL, plist.WebSubresources || []);
    }
    status.textContent = `Viewing captured ${format === 'mhtml' ? 'MHTML' : format === 'webarchive' ? 'WebArchive' : 'text'} version.`;
    frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    status.textContent = `Could not open the captured version: ${error?.message || error}`;
  }
}

function patchCapturedHtml(html, pageUrl, resources) {
  let patched = String(html || '');
  for (const resource of resources || []) {
    const url = resource.url || resource.WebResourceURL;
    const data = resource.data || resource.WebResourceData;
    if (!url || !data) continue;
    const mime = resource.mimeType || resource.WebResourceMIMEType || 'application/octet-stream';
    const replacement = bytesToDataUrl(data, mime);
    patched = patched.split(url).join(replacement);
  }
  const base = `<base href="${escapePreviewHtml(pageUrl || '')}">`;
  patched = /<head[\s>]/i.test(patched) ? patched.replace(/<head([^>]*)>/i, `<head$1>${base}`) : `${base}${patched}`;
  return patched.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<meta\b[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');
}

function bytesToDataUrl(value, mime) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return `data:${mime};base64,${btoa(binary)}`;
}

function escapePreviewHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function filterSavedLinkEntries(entries) {
  const terms = parseSearchTerms(databaseSearch.value.trim());
  if (!terms.length) return entries;
  const operatorFields = { content: 'content', title: 'title', url: 'url', author: 'author', keyword: 'keywords', keywords: 'keywords', site: 'siteName', lang: 'language', language: 'language' };
  const matches = entries.filter((entry) => {
    const value = typeof entry === 'string' ? { url: entry, metadata: {} } : entry || {};
    const metadata = value.metadata || {};
    const fields = {
      title: searchableText(value.title),
      url: searchableText([value.url, metadata.canonicalUrl]),
      description: searchableText(metadata.description),
      keywords: searchableText(metadata.keywords),
      author: searchableText(metadata.author),
      siteName: searchableText(metadata.siteName),
      language: searchableText(metadata.language),
      content: searchableText(metadata.searchText),
    };
    fields.all = searchableText([value, ...Object.values(fields)]);
    return terms.every(({ operator, value: term }) => {
      if (operator === 'type') return true;
      const field = operatorFields[operator] || searchField.value;
      return (fields[field] || fields.all).includes(term);
    });
  });
  return matches;
}

function appendPageMetadata(parent, metadata) {
  if (!metadata || typeof metadata !== 'object') return;
  const fields = [
    ['Description', metadata.description],
    ['Keywords', Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords],
    ['Author', metadata.author],
    ['Published', metadata.publishedTime],
    ['Modified', metadata.modifiedTime],
    ['Site', metadata.siteName],
    ['Type', metadata.type],
    ['Language', metadata.language],
    ['Content type', metadata.contentType],
    ['Canonical', metadata.canonicalUrl],
    ['Social image', metadata.image],
    ['Robots', metadata.robots],
  ].filter(([, value]) => String(value || '').trim());
  if (!fields.length) return;
  const list = document.createElement('div');
  list.className = 'saved-link-metadata';
  for (const [name, value] of fields) {
    const row = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = name;
    const text = document.createElement('span');
    text.textContent = value;
    row.append(label, text);
    list.append(row);
  }
  parent.append(list);
}
