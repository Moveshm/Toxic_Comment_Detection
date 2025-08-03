const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const chatOutput = document.getElementById("chat-output");

const API_URL = "http://127.0.0.1:8000/check_comment/";

// Auto-expand textarea
chatInput.addEventListener("input", function () {
    this.style.height = "20px";
    this.style.height = this.scrollHeight + "px";
});

// Send message on Enter key
chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Send message on Button click
sendBtn.addEventListener("click", () => sendMessage());

// Main function to send and receive
async function sendMessage(customText = null) {
    let text = customText !== null ? customText.trim() : chatInput.value.trim();
    if (text !== "") {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text }),
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const result = await response.json();
            if (!result || !result.status) throw new Error("Invalid response from server.");

            let messageDiv;
            if (result.status === "clean") {
                messageDiv = showMessage(
                    "✅ Clean Comment",
                    highlightText(result.text, {}),
                    "green"
                );
            } else {
                messageDiv = showMessage(
                    "⚠️ Toxic Comment Detected!",
                    highlightText(result.text, result.suggestions),
                    "red"
                );
                displaySuggestions(result.suggestions, messageDiv, result.text);
            }

            chatInput.value = "";
            chatInput.style.height = "20px";

        } catch (error) {
            console.error("Error:", error);
            showMessage("❌ Error", "Could not connect to the server!", "red");
        }
    }
}

// Show message box
function showMessage(title, message, color) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("chat-message");
    msgDiv.style.color = color;
    msgDiv.style.borderLeftColor = color;
    msgDiv.innerHTML = `<strong class="msg-title">${title}</strong><br><span class="message-text">${message}</span>`;

    chatOutput.appendChild(msgDiv);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    return msgDiv;
}

// Highlight text
function highlightText(text, suggestions) {
    const toxicWords = Object.keys(suggestions);
    if (toxicWords.length === 0) {
        return `<span style="color:green;">${text}</span>`;
    }

    let pattern = toxicWords.map(word => escapeRegExp(word)).join("|");
    let regex = new RegExp(`(${pattern})`, "giu");

    return text.split(regex).map((part) => {
        if (toxicWords.some(word => word.toLowerCase() === part.trim().toLowerCase())) {
            return `<span style="color:red;">${part}</span>`;
        } else if (part.trim() !== "") {
            return `<span style="color:green;">${part}</span>`;
        } else {
            return part;
        }
    }).join('');
}

// Escape special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Display Suggestions
function displaySuggestions(suggestions, messageDiv, originalText) {
    const suggestionContainer = document.createElement("div");
    suggestionContainer.classList.add("suggestion-container");

    Object.keys(suggestions).forEach((toxicWord) => {
        const wordContainer = document.createElement("div");
        wordContainer.classList.add("word-container");

        const label = document.createElement("span");
        label.innerHTML = `<strong>${toxicWord}:</strong>`;
        label.style.color = "red";
        wordContainer.appendChild(label);

        suggestions[toxicWord].forEach((alternative) => {
            const btn = document.createElement("button");
            btn.classList.add("suggestion-btn");
            btn.textContent = alternative;

            btn.onclick = function () {
                let messageSpan = messageDiv.querySelector(".message-text");
                let updatedHTML = messageSpan.innerHTML;

                const toxicRegex = new RegExp(`(${escapeRegExp(toxicWord)})`, "giu");
                updatedHTML = updatedHTML.replace(
                    toxicRegex,
                    `<span style="color:green;">${alternative}</span>`
                );

                Object.keys(suggestions).forEach((word) => {
                    const wordRegex = new RegExp(`(${escapeRegExp(word)})`, "giu");
                    updatedHTML = updatedHTML.replace(
                        wordRegex,
                        `<span style="color:red;">${word}</span>`
                    );
                });

                messageSpan.innerHTML = updatedHTML;
                wordContainer.remove();

                const remainingToxic = Object.keys(suggestions).some(word => {
                    const re = new RegExp(`(${escapeRegExp(word)})`, "giu");
                    return re.test(messageSpan.textContent);
                });

                if (!remainingToxic) {
                    messageDiv.querySelector(".msg-title").innerHTML = "✅ Cleaned Comment";
                    messageDiv.style.color = "green";
                    messageDiv.style.borderLeftColor = "green";
                    suggestionContainer.remove();
                }
            };

            wordContainer.appendChild(btn);
        });

        suggestionContainer.appendChild(wordContainer);
    });

    // Edit and Ignore buttons
    const actionContainer = document.createElement("div");
    actionContainer.style.marginTop = "10px";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️ Edit";
    editBtn.classList.add("suggestion-btn");
    editBtn.style.marginRight = "10px";

    const ignoreBtn = document.createElement("button");
    ignoreBtn.textContent = "🚫 Ignore";
    ignoreBtn.classList.add("suggestion-btn");

    editBtn.onclick = () => editComment(originalText, messageDiv, suggestionContainer);
    ignoreBtn.onclick = () => {
        messageDiv.remove();
        suggestionContainer.remove();
    };

    actionContainer.appendChild(editBtn);
    actionContainer.appendChild(ignoreBtn);
    suggestionContainer.appendChild(actionContainer);

    chatOutput.appendChild(suggestionContainer);
}

// Edit comment
async function editComment(currentText, messageDiv, suggestionContainer) {
    const editContainer = document.createElement("div");
    editContainer.style.marginTop = "10px";

    const inputBox = document.createElement("textarea");
    inputBox.value = currentText;
    inputBox.style.width = "100%";
    inputBox.style.padding = "8px";
    inputBox.style.marginTop = "8px";
    inputBox.style.fontSize = "16px";
    inputBox.rows = 3;

    const submitEditBtn = document.createElement("button");
    submitEditBtn.textContent = "✅ Submit Edit";
    submitEditBtn.classList.add("suggestion-btn");
    submitEditBtn.style.marginTop = "10px";

    editContainer.appendChild(inputBox);
    editContainer.appendChild(submitEditBtn);
    messageDiv.appendChild(editContainer);

    submitEditBtn.onclick = async () => {
        const newText = inputBox.value.trim();
        if (!newText) return;

        messageDiv.remove();
        suggestionContainer.remove();
        sendMessage(newText);
    };
}