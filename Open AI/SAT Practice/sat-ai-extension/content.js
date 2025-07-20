
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

// Helper function: wait for an element to appear in the DOM
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

// Attach click handlers to all .view-question-button
function setupListeners() {
    const buttons = document.querySelectorAll(".view-question-button");

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            try {
                const dialog = await waitForElement(".cb-dialog-header");

                // Prevent multiple buttons
                if (dialog.querySelector(".ai-explain-button")) return;

                // Create your button
                const explainBtn = document.createElement("button");
                explainBtn.innerText = "Explain with AI";
                explainBtn.className = "ai-explain-button";
                explainBtn.style.marginTop = "10px";
                explainBtn.style.padding = "8px";
                explainBtn.style.backgroundColor = "#4CAF50";
                explainBtn.style.color = "white";
                explainBtn.style.border = "none";
                explainBtn.style.cursor = "pointer";

                // Insert the button at the end of the dialog
                dialog.appendChild(explainBtn);

                // On click, get question text and log it
                explainBtn.onclick = async () => {
                    const questionEl = document.querySelector("#question-card");
                    const html = questionEl ? questionEl.outerHTML : "";

                    await loadMdScript()
                    console.log("marked:", marked);  // should be a function/object if loaded
                    // TODO: Replace with fetch to Flask

                    fetch("http://localhost:5000/explain", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ html: html })
                    })
                        .then(res => res.text())
                        .then(async data => {

                            // Open sidebar and show explanation
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
                        })
                        .catch(err => console.error("Fetch error:", err));

                };
            } catch (e) {
                console.warn(e);
            }
        });
    });
}


function injectSidebar() {
    if (document.getElementById("aiSidebar")) return; // only once

    // Sidebar container
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

    // Sidebar header with close button
    sidebar.innerHTML = `
  <div id="sidebarToggle" style="
    position: fixed;
    right: -25px;  /* just outside sidebar */
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

    // Close button event
    document.getElementById("closeSidebarBtn").onclick = () => {
        sidebar.style.width = "0";
    };
}

//sidebar Toggle function
function openSidebar() {
    sidebar.style.width = "400px";
    toggleBtn.innerHTML = "&gt;";  // Show right arrow
    toggleBtn.style.right = "-25px";
}

function closeSidebar() {
    sidebar.style.width = "0";
    toggleBtn.innerHTML = "&lt;";  // Show left arrow
    toggleBtn.style.right = "40px";
}

// Run once on load
setupListeners();
injectSidebar();

const sidebar = document.getElementById("aiSidebar");
const toggleBtn = document.getElementById("sidebarToggle");
const closeBtn = document.getElementById("closeSidebarBtn");

// Initially Close sidebar
closeSidebar();

// Sidebar toggle button
toggleBtn.onclick = (e) => {
    e.stopPropagation();
    if (sidebar.style.width === "0px" || sidebar.style.width === "") {
        openSidebar();
    } else {
        closeSidebar();
    }
};

// Sidebar close button
closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeSidebar();
};

sidebar.onclick = (e) => {
    e.stopPropagation();
};

// Re-run if new content is added later (dynamic site)
const observer = new MutationObserver(() => {
    setupListeners();
});

observer.observe(document.body, { childList: true, subtree: true });
