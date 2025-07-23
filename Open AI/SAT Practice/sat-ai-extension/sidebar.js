// sidebar.js - Unified chat sidebar component

class AISidebar {
    constructor() {
        this.sidebar = null;
        this.toggleBtn = null;
        this.closeBtn = null;
        this.chatMessages = [];
        this.init();
    }

    init() {
        this.injectSidebar();
        this.setupEventListeners();
        this.closeSidebar();
    }

    injectSidebar() {
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
            display: flex;
            flex-direction: column;
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

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#333; font-size:16px;">AI Assistant</h3>
                <button id="closeSidebarBtn" style="cursor:pointer; font-size:20px; border:none; background:none;">&times;</button>
            </div>

            <!-- Unified Chat Messages -->
            <div id="chatMessages" style="
                flex: 1;
                overflow-y: auto;
                padding-right: 10px;
                margin-bottom: 15px;
                background: white;
                border-radius: 8px;
                padding: 15px;
                border: 1px solid #ddd;
            "></div>
            
            <!-- Input Section -->
            <div style="display:flex; gap:5px; margin-bottom:8px;">
                <input type="text" id="chatInput" placeholder="Ask a question about this problem..." style="
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                ">
                <button id="sendChatBtn" style="
                    padding: 8px 12px;
                    background: #4caf50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">Send</button>
            </div>
            
            <button id="clearChatBtn" style="
                padding: 4px 8px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            ">Clear Chat</button>
        `;

        document.body.appendChild(sidebar);

        // Store references
        this.sidebar = sidebar;
        this.toggleBtn = document.getElementById("sidebarToggle");
        this.closeBtn = document.getElementById("closeSidebarBtn");
    }

    setupEventListeners() {
        // Toggle button
        this.toggleBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.sidebar.style.width === "0px" || this.sidebar.style.width === "") {
                this.openSidebar();
            } else {
                this.closeSidebar();
            }
        };

        // Close button
        this.closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.closeSidebar();
        };

        // Prevent sidebar clicks from closing
        this.sidebar.onclick = (e) => e.stopPropagation();

        // Chat functionality
        document.getElementById("sendChatBtn").onclick = () => this.sendChatMessage();
        document.getElementById("chatInput").onkeypress = (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        };
        document.getElementById("clearChatBtn").onclick = () => this.clearChat();
    }

    openSidebar() {
        this.sidebar.style.width = "400px";
        this.toggleBtn.innerHTML = "&gt;";
        this.toggleBtn.style.right = "-25px";
    }

    closeSidebar() {
        this.sidebar.style.width = "0";
        this.toggleBtn.innerHTML = "&lt;";
        this.toggleBtn.style.right = "40px";
    }

    async sendChatMessage() {
        const input = document.getElementById("chatInput");
        const message = input.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addChatMessage(message, 'user');
        input.value = '';

        // Get current question context
        const questionEl = document.querySelector("#question-card");

        try {
            // Get API settings
            const { apiKey, model } = await new Promise(resolve => {
                chrome.storage.local.get(["apiKey", "model"], resolve);
            });

            const response = await fetch("http://localhost:5000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api: apiKey,
                    model: model || "llama-3.1-8b-instant",
                    message,
                    question_id: this.questionId
                })
            });

            const aiResponse = await response.text();
            this.addChatMessage(aiResponse, 'ai');
        } catch (error) {
            console.error("Chat error:", error);
            this.addChatMessage("Sorry, I encountered an error. Please try again.", 'ai');
        }
    }

    addChatMessage(message, sender, isExplanation = false) {
        const chatMessages = document.getElementById("chatMessages");
        const messageDiv = document.createElement("div");

        // Different styling for explanations vs regular chat
        if (isExplanation) {
            messageDiv.style.cssText = `
                margin-bottom: 15px;
                padding: 15px;
                border-radius: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-size: 14px;
                border-left: 4px solid #4caf50;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `;
        } else {
            messageDiv.style.cssText = `
                margin-bottom: 10px;
                padding: 10px;
                border-radius: 12px;
                font-size: 13px;
                max-width: 85%;
                ${sender === 'user' ?
                    'background: #4caf50; color: white; margin-left: auto; align-self: flex-end;' :
                    'background: #e8e8e8; color: black; margin-right: auto; align-self: flex-start;'
                }
            `;
        }

        // Add sender label for regular messages
        if (!isExplanation) {
            const senderLabel = document.createElement("div");
            senderLabel.style.cssText = `
                font-size: 11px;
                opacity: 0.7;
                margin-bottom: 4px;
                font-weight: bold;
            `;
            senderLabel.textContent = sender === 'user' ? 'You' : 'AI Assistant';
            messageDiv.appendChild(senderLabel);
        }

        const contentDiv = document.createElement("div");
        contentDiv.innerHTML = sender === 'ai' && typeof marked !== 'undefined' ?
            marked.parse(message) : message;
        messageDiv.appendChild(contentDiv);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Store in chat history
        this.chatMessages.push({ sender, message, isExplanation });
    }

    clearChat() {
        const chatMessages = document.getElementById("chatMessages");
        chatMessages.innerHTML = '';
        this.chatMessages = [];
    }

    // Method to display explanation as first AI message
    async displayExplanation(content) {
        this.openSidebar();

        // Clear any existing messages first
        this.clearChat();

        // Get question ID for reference
        let questionId = '';
        const questionIdEl = document.querySelector(".question-id");
        if (questionIdEl) {
            const idText = questionIdEl.textContent.trim();
            this.questionId = idText.replace(/^ID:\s*/, '');

            // Add explanation as a special AI message
            await this.loadMdScript();
            this.addChatMessage(content, 'ai', true);

            // Add a follow-up prompt to encourage questions
            setTimeout(() => {
                const followUpMessage = questionId ?
                    `Feel free to ask me any questions about this problem (ID: ${questionId})! I'm here to help you understand it better.` :
                    `Feel free to ask me any questions about this problem! I'm here to help you understand it better.`;
                this.addChatMessage(followUpMessage, 'ai');
            }, 500);
        }
    }

    // Load markdown script
    async loadMdScript() {
        return new Promise((resolve, reject) => {
            if (typeof marked !== 'undefined') return resolve();

            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/marked.min.js');
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load marked.js"));
            document.head.appendChild(script);
        });
    }
}

// Export for use in other files
window.AISidebar = AISidebar;