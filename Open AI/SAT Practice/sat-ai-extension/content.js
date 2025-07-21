// load Md script
function loadMdScript() {
    return new Promise((resolve, reject) => {
        if (typeof marked !== 'undefined') return resolve();

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('lib/marked.min.js');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load marked.js"));
        document.head.appendChild(script);
    });
}

// Wait for element
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const intervalTime = 100;
        let timePassed = 0;
        const interval = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(interval);
                resolve(el);
            } else if (timePassed > timeout) {
                clearInterval(interval);
                reject(`Timeout waiting for ${selector}`);
            }
            timePassed += intervalTime;
        }, intervalTime);
    });
}

// Setup listeners
function setupListeners(apiKey, model) {
    const buttons = document.querySelectorAll(".view-question-button");

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            try {
                const dialog = await waitForElement(".cb-dialog-header");
                if (dialog.querySelector(".ai-explain-button")) return;

                const explainBtn = document.createElement("button");
                explainBtn.innerText = "Explain with AI";
                explainBtn.className = "ai-explain-button";
                Object.assign(explainBtn.style, {
                    marginTop: "10px",
                    padding: "8px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    cursor: "pointer"
                });

                dialog.appendChild(explainBtn);

                explainBtn.onclick = async () => {
                    explainBtn.innerText = 'Loading';
                    const questionEl = document.querySelector("#question-card");
                    const html = questionEl ? questionEl.outerHTML : "";
                    let subject = '';

                    await loadMdScript();

                    const headers = document.querySelectorAll('.question-banner .column-header');
                    headers.forEach(header => {
                        if (header.textContent.trim() === 'Test') {
                            subject = header.nextElementSibling.textContent.trim();
                        }
                    });


                    fetch("http://localhost:5000/explain", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ api: apiKey, model, html, subject })
                    })
                        .then(res => res.text())
                        .then(async data => {
                            const sidebar = document.getElementById("aiSidebar");
                            openSidebar();
                            if (sidebar) {
                                sidebar.style.width = "400px";
                                const content = document.getElementById("aiContent");
                                if (content) {
                                    await loadMdScript();
                                    if (typeof marked !== 'undefined') {
                                        content.innerHTML = marked.parse(data);
                                    } else {
                                        content.textContent = data;
                                    }
                                }
                            }
                            explainBtn.innerText = 'Explain with AI';
                        })
                        .catch(err => console.error("Fetch error:", err));
                };
            } catch (e) {
                console.warn(e);
            }
        });
    });
}

// Inject sidebar
function injectSidebar() {
    if (document.getElementById("aiSidebar")) return;

    const sidebar = document.createElement("div");
    sidebar.id = "aiSidebar";
    sidebar.style.cssText = `
        height: 100%;
        width: 0;
        position: fixed;
        top: 0;
        right: 0;
        background-color: #f9f9f9;
        overflow-x: hidden;
        transition: 0.3s;
        box-shadow: -2px 0 10px rgba(0,0,0,0.2);
        padding: 20px;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;

    sidebar.innerHTML = `
      <div id="sidebarToggle" style="
        position: fixed;
        right: -25px;
        top: 20px;
        width: 25px;
        height: 60px;
        background-color: #4caf50;
        color: white;
        font-size: 24px;
        line-height: 60px;
        text-align: center;
        cursor: pointer;
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
        user-select: none;
        z-index: 10001;
      ">&lt;</div>

      <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom:10px;">
        <span>AI Explanation</span>
        <button id="closeSidebarBtn" style="cursor:pointer; font-size:20px; border:none; background:none;">&times;</button>
      </div>
      <div id="aiContent" style="overflow-y:auto; max-height:90%;"></div>
    `;

    document.body.appendChild(sidebar);

    document.getElementById("closeSidebarBtn").onclick = () => {
        sidebar.style.width = "0";
    };
}

// Sidebar toggle helpers
function openSidebar() {
    sidebar.style.width = "400px";
    toggleBtn.innerHTML = "&gt;";
    toggleBtn.style.right = "-25px";
}

function closeSidebar() {
    sidebar.style.width = "0";
    toggleBtn.innerHTML = "&lt;";
    toggleBtn.style.right = "40px";
}

// Init
injectSidebar();

const sidebar = document.getElementById("aiSidebar");
const toggleBtn = document.getElementById("sidebarToggle");
const closeBtn = document.getElementById("closeSidebarBtn");

closeSidebar();

toggleBtn.onclick = (e) => {
    e.stopPropagation();
    if (sidebar.style.width === "0px" || sidebar.style.width === "") {
        openSidebar();
    } else {
        closeSidebar();
    }
};

closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeSidebar();
};

sidebar.onclick = (e) => e.stopPropagation();

// Read apiKey/model from storage and wire up listeners
function applySettingsFromStorage() {
  chrome.storage.local.get(["apiKey", "model"], ({ apiKey, model }) => {
    // Fallback to default model if not set
    if (!model) model = "llama-3.1-8b-instant";
    setupListeners(apiKey, model);
  });
}

applySettingsFromStorage();

// Re-apply listeners if storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.apiKey || changes.model)) {
    applySettingsFromStorage();
  }
});

// If buttons are added dynamically, re-apply listeners
const observer = new MutationObserver(() => {
  applySettingsFromStorage();
});
observer.observe(document.body, { childList: true, subtree: true });
