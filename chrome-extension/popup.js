// ---- State ----
let tags = [];
let currentTab = null;

// ---- DOM refs ----
const views = {
  loading: document.getElementById('loading-view'),
  connect: document.getElementById('connect-view'),
  save: document.getElementById('save-view'),
  success: document.getElementById('success-view'),
  error: document.getElementById('error-view'),
};

// ---- Helpers ----

/** Show a single view, hide all others */
function showView(viewName) {
  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle('hidden', name !== viewName);
  });
}

/** Check if a URL can be saved (not a browser internal page) */
function isSaveableUrl(url) {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
}

// ---- Initialization ----

async function init() {
  showView('loading');

  // Check auth state via background worker
  const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });

  if (response?.session) {
    await loadCurrentTab();
    showView('save');
  } else {
    showView('connect');
  }
}

/** Load info about the currently active tab */
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (tab) {
    const titleEl = document.getElementById('page-title');
    const urlEl = document.getElementById('page-url');
    const faviconEl = document.getElementById('page-favicon');
    const saveBtn = document.getElementById('save-btn');

    titleEl.textContent = tab.title || 'Untitled';
    urlEl.textContent = tab.url || '';

    if (tab.favIconUrl) {
      faviconEl.src = tab.favIconUrl;
      faviconEl.style.display = 'block';
    } else {
      faviconEl.style.display = 'none';
    }

    // Disable save for non-saveable URLs
    if (!isSaveableUrl(tab.url)) {
      titleEl.textContent = 'Cannot save this page';
      urlEl.textContent = 'Only http/https pages can be saved';
      saveBtn.disabled = true;
    }
  }
}

// ---- Event handlers ----

// Connect button
document.getElementById('connect-btn').addEventListener('click', () => {
  const extensionId = chrome.runtime.id;
  const loginUrl = `${CONFIG.APP_URL}/auth/login?extensionId=${extensionId}`;
  chrome.tabs.create({ url: loginUrl });
  window.close();
});

// Save button
document.getElementById('save-btn').addEventListener('click', async () => {
  if (!currentTab?.url || !isSaveableUrl(currentTab.url)) return;

  const saveBtn = document.getElementById('save-btn');
  const btnText = document.getElementById('save-btn-text');
  const btnLoading = document.getElementById('save-btn-loading');

  saveBtn.disabled = true;
  btnText.classList.add('hidden');
  btnLoading.classList.remove('hidden');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SOURCE',
      url: currentTab.url,
      title: currentTab.title || '',
      tags: tags,
    });

    if (response?.success) {
      document.getElementById('view-dashboard-link').href =
        `${CONFIG.APP_URL}/dashboard/library`;
      showView('success');

      // Auto-close popup after 2 seconds
      setTimeout(() => window.close(), 2000);
    } else {
      document.getElementById('error-message').textContent =
        response?.error || 'Something went wrong';
      showView('error');
    }
  } catch (err) {
    document.getElementById('error-message').textContent =
      'Failed to communicate with the extension. Please reload.';
    showView('error');
  }

  // Reset button state (for when user retries)
  saveBtn.disabled = false;
  btnText.classList.remove('hidden');
  btnLoading.classList.add('hidden');
});

// Tags input
document.getElementById('tags-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const tag = e.target.value.trim().toLowerCase();

    if (tag && !tags.includes(tag)) {
      tags.push(tag);
      renderTags();
    }
    e.target.value = '';
  }
});

function renderTags() {
  const tagsList = document.getElementById('tags-list');
  tagsList.innerHTML = tags
    .map(
      (tag, i) =>
        `<span class="tag">${tag}<span class="tag-remove" data-index="${i}">&times;</span></span>`
    )
    .join('');

  tagsList.querySelectorAll('.tag-remove').forEach((el) => {
    el.addEventListener('click', () => {
      tags.splice(parseInt(el.dataset.index), 1);
      renderTags();
    });
  });
}

// Disconnect button
document.getElementById('disconnect-btn').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'DISCONNECT' });
  tags = [];
  renderTags();
  showView('connect');
});

// Retry button
document.getElementById('retry-btn').addEventListener('click', () => {
  showView('save');
});

// ---- Start ----
init();
