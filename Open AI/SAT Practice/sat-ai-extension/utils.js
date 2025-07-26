// Function to get UID
window.getOrCreateUserId = async function() {
  return new Promise((resolve) => {
    chrome.storage.local.get("userId", (result) => {
      if (result.userId) {
        resolve(result.userId);
      } else {
        const newId = crypto.randomUUID();
        chrome.storage.local.set({ userId: newId }, () => {
          resolve(newId);
        });
      }
    });
  });
};
