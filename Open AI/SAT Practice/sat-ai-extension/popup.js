document.addEventListener("DOMContentLoaded", () => {
  const apiInput   = document.getElementById("apiKey");
  const modelInput = document.getElementById("modelSelect");
  const saveBtn    = document.getElementById("saveBtn");
  const status     = document.getElementById("status");


  // 1) initial load
  chrome.storage.local.get(["apiKey","model"], data => {
    apiInput.value   = data.apiKey || "";
    modelInput.value = data.model   || "";
  });

  // 2) save new settings
  saveBtn.addEventListener("click", () => {
    const api   = apiInput.value.trim();
    const model = modelInput.value;
    chrome.storage.local.set({ apiKey: api, model: model }, () => {
      status.textContent = "Saved! Reloading...";
      // Reload the active tab (not the popup)
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
    });
  });
});
