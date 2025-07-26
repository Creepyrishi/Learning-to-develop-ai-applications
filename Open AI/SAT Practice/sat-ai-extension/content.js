// content.js - Main content script

// Initialize the sidebar
const aiSidebar = new AISidebar();

// Wait for element utility
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

// Function to save response to backend
async function saveResponse(apiKey, questionId, response) {
    try {
        const saveResponse = await fetch("http://localhost:5000/save_response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                api: apiKey,
                question_id: questionId,
                response: response
            })
        });
        
        if (saveResponse.ok) {
            console.log("Response saved successfully");
        } else {
            console.error("Failed to save response:", saveResponse.status);
        }
    } catch (error) {
        console.error("Error saving response:", error);
    }
}

// Function to read streamed response
async function readStreamedResponse(response) {
    const reader = response.body.getReader();
    let fullResponse = '';
    
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = new TextDecoder().decode(value);
            fullResponse += chunk;
        }
        return fullResponse;
    } finally {
        reader.releaseLock();
    }
}

// Setup listeners for question buttons
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

                explainBtn.classList.add('cb-btn','square', 'cb-roboto', 'cb-btn-primary', 'cb-btn', 'cb-btn-primary', 'cb-roboto')


                dialog.appendChild(explainBtn);

                explainBtn.onclick = async () => {
                    explainBtn.innerText = 'Loading...';
                    explainBtn.disabled = true;
                    
                    try {
                        const questionEl = document.querySelector("#question-card");
                        const html = questionEl ? questionEl.outerHTML : "";
                        const question_id = document.querySelector('h5.question-id').textContent.split(': ')[1];
                        let subject = '';
                        
                        // Get subject from headers
                        const headers = document.querySelectorAll('.question-banner .column-header');
                        headers.forEach(header => {
                            if (header.textContent.trim() === 'Test') {
                                subject = header.nextElementSibling.textContent.trim();
                            }
                        });

                        // Make API call to get explanation
                        const response = await fetch("http://localhost:5000/explain", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                                api: apiKey, 
                                model: model || "llama-3.1-8b-instant",
                                question_id: question_id, 
                                html, 
                                subject 
                            })
                        });

                        // Read the streamed response
                        const explanation = await readStreamedResponse(response);
                        
                        // Display explanation in sidebar
                        await aiSidebar.displayExplanation(explanation);
                        
                        // Save the response to backend
                        await saveResponse(apiKey, question_id, explanation);
                        
                    } catch (error) {
                        console.error("Explanation error:", error);
                        alert("Failed to get explanation. Please try again.");
                    } finally {
                        explainBtn.innerText = 'Explain with AI';
                        explainBtn.disabled = false;
                    }
                };
            } catch (e) {
                console.warn("Error setting up explain button:", e);
            }
        });
    });
}

// Read settings from storage and apply
function applySettingsFromStorage() {
    chrome.storage.local.get(["apiKey", "model"], ({ apiKey, model }) => {
        if (!apiKey) {
            console.warn("No API key found. Please set it in the extension settings.");
            return;
        }
        setupListeners(apiKey, model || "llama-3.1-8b-instant");
    });
}

// Initialize
applySettingsFromStorage();

// Re-apply listeners when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.apiKey || changes.model)) {
        applySettingsFromStorage();
    }
});

// Re-apply listeners when DOM changes (for dynamically added buttons)
const observer = new MutationObserver(() => {
    applySettingsFromStorage();
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true 
});

// --- Toggle Hide/View Button for Answer Section ---

function injectToggleButtons() {
    const pdfBtnContainers = document.querySelectorAll('.cb-dialog-content > .row > div');

    pdfBtnContainers.forEach((container) => {
        if (!container.querySelector('#toggleButton')) {
            const toggleButton = document.createElement('button');
            toggleButton.innerText = 'View Answer';
            toggleButton.id = 'toggleButton';

            // Style the button
            toggleButton.classList.add('cb-btn','square', 'cb-roboto', 'cb-btn-primary', 'cb-btn', 'cb-btn-primary', 'cb-roboto')
            toggleButton.style.marginTop = '10px';
            toggleButton.style.marginRight = '10px';

            // Append the button next to "Add to PDF"
            container.insertBefore(toggleButton, container.firstChild);


            // Hide answer-content by default
            const answerSections = document.getElementsByClassName('answer-content');
            Array.from(answerSections).forEach((el) => {
                el.style.display = 'none';
            });

            // Toggle visibility on click
            toggleButton.addEventListener('click', () => {
                const answerSections = document.getElementsByClassName('answer-content');
                Array.from(answerSections).forEach((el) => {
                    const isHidden = el.style.display === 'none';
                    el.style.display = isHidden ? 'block' : 'none';
                    toggleButton.innerText = isHidden ? 'Hide Answer' : 'View Answer';
                });
            });
        }
    });
}

// Inject immediately on page load
injectToggleButtons();

// Observe for dynamically added dialogs
const toggleObserver = new MutationObserver(() => {
    injectToggleButtons();
});
toggleObserver.observe(document.body, { childList: true, subtree: true });
