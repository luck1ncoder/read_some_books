// Prevent the side panel from opening automatically when the action icon is clicked.
// We open it programmatically only on annotate actions.
// Using setPanelBehavior replaces the old tabs.onUpdated per-tab disable approach,
// which caused sidePanel.open() to silently fail (panel was disabled).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Proxy fetch requests from content scripts to bypass page CSP restrictions.
  if (message.type === 'FETCH') {
    fetch(message.url, message.options)
      .then(res => res.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }

  // Called immediately on mousedown in content script, before any awaits.
  // User gesture token is still live here, so sidePanel.open() works.
  // Panel is always enabled (no per-tab disabling), so no setOptions needed.
  if (message.type === 'OPEN_SIDEPANEL_NOW') {
    const tabId = sender.tab?.id
    if (!tabId) return false
    chrome.sidePanel.open({ tabId }).catch(() => {})
    return false
  }

  // FOCUS_HIGHLIGHT is sent by content script directly via runtime.sendMessage.
  // The sidepanel receives it directly — no forwarding needed here.
  // Background ignores it to avoid self-messaging loops.
})
