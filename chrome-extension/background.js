importScripts('config.js');

// ============================================================
// Install / Setup
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  // Create right-click context menu
  chrome.contextMenus.create({
    id: 'save-to-content-hub',
    title: 'Save to Content Hub',
    contexts: ['page', 'link'],
  });
});

// ============================================================
// Context Menu
// ============================================================

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-content-hub') {
    const url = info.linkUrl || info.pageUrl;
    const title = tab?.title || '';
    await saveSource(url, title, tab?.id);
  }
});

// ============================================================
// Keyboard Shortcut
// ============================================================

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-to-hub') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await saveSource(tab.url, tab.title || '', tab.id);
    }
  }
});

// ============================================================
// Messages from web pages (auth callback)
// ============================================================

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_SESSION' && message.session) {
    chrome.storage.local.set(
      {
        session: message.session,
        connectedAt: Date.now(),
      },
      () => {
        sendResponse({ success: true });
      }
    );
    // Return true to keep the message channel open for the async sendResponse
    return true;
  }
});

// ============================================================
// Messages from popup
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_SOURCE') {
    saveSource(message.url, message.title, null, message.tags)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_SESSION') {
    getValidSession()
      .then((session) => sendResponse({ session }))
      .catch(() => sendResponse({ session: null }));
    return true;
  }

  if (message.type === 'DISCONNECT') {
    chrome.storage.local.remove(['session', 'connectedAt'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// ============================================================
// Session Management
// ============================================================

/**
 * Get a valid (non-expired) session, refreshing if needed.
 * Returns the session object or null.
 */
async function getValidSession() {
  const result = await chrome.storage.local.get('session');
  const session = result.session;

  if (!session) return null;

  // Check if token is expired or will expire within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - now < 300) {
    return await refreshSession(session.refresh_token);
  }

  return session;
}

/**
 * Refresh the session using Supabase REST API.
 * Returns the new session or null on failure.
 */
async function refreshSession(refreshToken) {
  if (!refreshToken) return null;

  try {
    const response = await fetch(
      `${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const newSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };

    await chrome.storage.local.set({ session: newSession });
    return newSession;
  } catch (error) {
    console.error('[Content Hub] Failed to refresh session:', error);
    return null;
  }
}

// ============================================================
// Source Saving
// ============================================================

/**
 * Save a URL as a source via the Next.js quick-add API.
 */
async function saveSource(url, title, tabId, tags = []) {
  const session = await getValidSession();

  if (!session) {
    showBadge('!', '#ef4444', tabId);
    return { success: false, error: 'Not authenticated. Please connect first.' };
  }

  try {
    const response = await fetch(`${CONFIG.APP_URL}/api/sources/quick-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ url, title, tags }),
    });

    const data = await response.json();

    if (data.success) {
      showBadge('✓', '#22c55e', tabId);
      return { success: true, data: data.data };
    } else {
      showBadge('!', '#ef4444', tabId);
      return { success: false, error: data.error || 'Failed to save' };
    }
  } catch (error) {
    showBadge('!', '#ef4444', tabId);
    return { success: false, error: 'Network error. Is the app running?' };
  }
}

// ============================================================
// Badge Indicator
// ============================================================

/**
 * Briefly show a badge on the extension icon (clears after 3s).
 */
function showBadge(text, color, tabId) {
  const textOpts = { text };
  const colorOpts = { color };

  if (tabId) {
    textOpts.tabId = tabId;
    colorOpts.tabId = tabId;
  }

  chrome.action.setBadgeText(textOpts);
  chrome.action.setBadgeBackgroundColor(colorOpts);

  setTimeout(() => {
    const clearOpts = { text: '' };
    if (tabId) clearOpts.tabId = tabId;
    chrome.action.setBadgeText(clearOpts);
  }, 3000);
}
