(() => {
  if (document.getElementById('webarchivePilotMenu')) return;

  const style = document.createElement('style');
  style.textContent = `
    :root { --wap-toolbar-height:58px; }
    body { padding-top:var(--wap-toolbar-height)!important; }
    .wap-menu { position:fixed; inset:0 0 auto 0; z-index:2147483647; min-height:50px; padding:7px 10px; border-bottom:1px solid #d8dbe2; background:#fffffffa; box-shadow:0 3px 14px #10182817; backdrop-filter:blur(12px); font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#344054; }
    .wap-menu-panel { width:100%; display:flex; align-items:center; justify-content:flex-end; gap:6px; }
    .wap-menu-brand { margin-right:auto; padding:0 8px; color:#1d2939; font-weight:700; white-space:nowrap; }
    .wap-menu-item { display:flex; align-items:center; justify-content:center; gap:6px; min-width:0; padding:8px 9px; border:1px solid #d8dbe2; border-radius:8px; background:#fff; color:#344054; cursor:pointer; white-space:nowrap; font:inherit; font-size:12px; font-weight:600; }
    .wap-menu-item:hover,.wap-menu-item.current { border-color:#0a7cff; background:#f2f8ff; color:#0a67c7; }
    .wap-menu-item:focus-visible { outline:3px solid #0a7cff40; outline-offset:2px; }
    .wap-menu-icon { width:16px; flex:0 0 16px; color:#0a67c7; text-align:center; font-size:14px; }
    @media(max-width:1100px) { .wap-menu-brand,.wap-menu-text { display:none; }.wap-menu-panel { justify-content:space-between; }.wap-menu-item { flex:1 1 0; padding:8px 5px; }.wap-menu-icon { width:auto; flex:0 0 auto; } }
    @media(max-width:420px) { :root { --wap-toolbar-height:49px; }.wap-menu { min-height:42px; padding:5px 4px; }.wap-menu-panel { gap:3px; }.wap-menu-item { padding:7px 3px; border-radius:7px; }.wap-menu-icon { font-size:13px; } }
  `;
  document.head.append(style);

  const menu = document.createElement('nav');
  menu.id = 'webarchivePilotMenu';
  menu.className = 'wap-menu';
  menu.setAttribute('aria-label', 'WebArchive Crawler main menu');
  const panel = document.createElement('div');
  panel.className = 'wap-menu-panel';
  const brand = document.createElement('span');
  brand.className = 'wap-menu-brand';
  brand.textContent = 'WebArchive Crawler';
  panel.append(brand);
  const items = [
    ['◫', 'Archive database', 'database.html'],
    ['◷', 'Archive history', 'downloads.html'],
    ['▣', 'Archive viewer', 'viewer.html'],
    ['⚙', 'Crawler settings', 'settings.html'],
    ['＋', 'Capture website', 'capture'],
    ['✦', 'Request feature', 'feature-request.html'],
    ['ⓘ', 'Privacy', 'privacy-policy.html'],
    ['⌁', 'Permissions', 'permissions'],
  ];
  const currentPage = location.pathname.split('/').pop() || '';
  for (const [icon, label, target] of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wap-menu-item';
    button.dataset.target = target;
    button.title = label;
    button.setAttribute('aria-label', label);
    if (target === currentPage) button.classList.add('current');
    const iconElement = document.createElement('span');
    iconElement.className = 'wap-menu-icon';
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.textContent = icon;
    const text = document.createElement('span');
    text.className = 'wap-menu-text';
    text.textContent = label;
    button.append(iconElement, text);
    panel.append(button);
  }
  menu.append(panel);
  document.body.prepend(menu);

  panel.addEventListener('click', async (event) => {
    const button = event.target.closest('.wap-menu-item');
    if (!button) return;
    const target = button.dataset.target;
    if (target === 'capture') { await openWebsiteCapture(); return; }
    if (target === 'permissions') {
      try { await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }); }
      catch (_) { alert('Open chrome://extensions, select WebArchive Crawler, and choose Details.'); }
      return;
    }
    await chrome.tabs.create({ url: chrome.runtime.getURL(target) });
  });

  async function openWebsiteCapture() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let sourceUrl = /^https?:/i.test(activeTab?.url || '') ? activeTab.url : '';
    let sourceTabId = sourceUrl ? activeTab.id : null;
    if (!sourceUrl) {
      const input = prompt('Enter the website URL to crawl.');
      if (!input?.trim()) return;
      try {
        const parsed = new URL(input.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        sourceUrl = parsed.href;
        const source = await chrome.tabs.create({ url: sourceUrl, active: false });
        sourceTabId = source.id;
      } catch (_) { alert('Enter a valid HTTP or HTTPS website URL.'); return; }
    }
    const query = new URLSearchParams({ sourceUrl });
    if (sourceTabId !== null && sourceTabId !== undefined) query.set('sourceTabId', String(sourceTabId));
    await chrome.tabs.create({ url: chrome.runtime.getURL(`website-archive.html?${query}`) });
  }

  if (currentPage === 'popup.html') document.getElementById('settingsBtn')?.remove();
})();
