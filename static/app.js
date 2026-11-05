// ===============================================
// FISCAL FUSION
// Authentication + Gemini AI + Conversation History
// ===============================================


// -----------------------------------------------
// 1. HTML ELEMENTS
// -----------------------------------------------

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");

const statusText = document.getElementById("status");
const conversationOutput = document.getElementById("conversationOutput");

const agreementSection = document.getElementById("agreementSection");
const finalAgreement = document.getElementById("finalAgreement");
const actionPlan = document.getElementById("actionPlan");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotPasswordEmail = document.getElementById("forgotPasswordEmail");
const forgotPasswordMessage = document.getElementById("forgotPasswordMessage");

const resetPasswordForm = document.getElementById("resetPasswordForm");
const newPasswordInput = document.getElementById("newPassword");
const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
const resetPasswordMessage = document.getElementById("resetPasswordMessage");
const resetPasswordCard = document.getElementById("reset-password");
const resetBackToLoginLink = document.getElementById("resetBackToLoginLink");

const signupMessage = document.getElementById("signupMessage");
const loginMessage = document.getElementById("loginMessage");

const forgotPasswordLink = document.getElementById("forgotPasswordLink");

const signupNav = document.getElementById("signupNav");
const loginNav = document.getElementById("loginNav");
const logoutBtn = document.getElementById("logoutBtn");

const loginRequired = document.getElementById("loginRequired");
const simulatorContent = document.getElementById("simulatorContent");

const historySection = document.getElementById("history");
const historyNav = document.getElementById("historyNav");
const historyList = document.getElementById("historyList");
const historyStatus = document.getElementById("historyStatus");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");

const authenticationSection = document.getElementById("authenticationSection");
const settingsSection = document.getElementById("settings");
const settingsNav = document.getElementById("settingsNav");
const settingsName = document.getElementById("settingsName");
const settingsEmail = document.getElementById("settingsEmail");
const settingsRole = document.getElementById("settingsRole");
const settingsStatus = document.getElementById("settingsStatus");
const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");

const adminDashboardNav = document.getElementById("adminDashboardNav");
const adminDashboardSection = document.getElementById("adminDashboard");
const adminDashboardStatus = document.getElementById("adminDashboardStatus");
const refreshAdminBtn = document.getElementById("refreshAdminBtn");

const adminTotalUsers = document.getElementById("adminTotalUsers");
const adminTotalConversations = document.getElementById("adminTotalConversations");
const adminTotalLogins = document.getElementById("adminTotalLogins");
const adminTotalLogouts = document.getElementById("adminTotalLogouts");

const adminUsersBody = document.getElementById("adminUsersBody");
const adminActivityBody = document.getElementById("adminActivityBody");


let conversationData = null;
let currentUser = null;
let captchaWidgetId = null;


// -----------------------------------------------
// 2. HELPER FUNCTIONS
// -----------------------------------------------

async function readResponse(response) {

    const data = await response.json();

    if (!response.ok) {

        if (typeof data.detail === "string") {
            throw new Error(data.detail);
        }

        throw new Error("Request failed. Please try again.");
    }

    return data;
}


function clearConversation() {

    conversationData = null;

    conversationOutput.innerHTML = "";
    finalAgreement.textContent = "";
    actionPlan.innerHTML = "";

    agreementSection.hidden = true;
    statusText.textContent = "";
}


function updateAuthenticationUI() {
    const loggedIn = currentUser !== null;
    const isAdmin = loggedIn &&
        String(currentUser.role || "").toLowerCase() === "admin";

    signupNav.hidden = loggedIn;
    loginNav.hidden = loggedIn;
    logoutBtn.hidden = !loggedIn;

    loginRequired.hidden = loggedIn;
    simulatorContent.hidden = !loggedIn;

    historySection.hidden = !loggedIn;
    historyNav.hidden = !loggedIn;

    if (settingsNav) {
        settingsNav.hidden = !loggedIn;
    }

    if (adminDashboardNav) {
        adminDashboardNav.hidden = !isAdmin;
    }

    if (!isAdmin && adminDashboardSection) {
        adminDashboardSection.hidden = true;
    }

    if (!loggedIn) {
        clearConversation();
        historyList.innerHTML = "";
        historyStatus.textContent = "";
    }

    showCurrentScreen();
}






function showCurrentScreen() {
    const route = window.location.hash || "#home";

    const authRoutes = [
        "#signup",
        "#login",
        "#forgot-password",
        "#reset-password"
    ];

    const loggedIn = currentUser !== null;
    const isAdmin =
        loggedIn &&
        String(currentUser.role || "").toLowerCase() === "admin";

    // Redirect users who are not authorized for protected sections.
    if (route === "#settings" && !loggedIn) {
        window.location.hash = "#login";
        return;
    }

    if (route === "#adminDashboard") {
        if (!loggedIn) {
            window.location.hash = "#login";
            return;
        }

        if (!isAdmin) {
            window.location.hash = "#home";
            return;
        }
    }

    // Hide every main section before showing the selected one.
    const sectionIds = [
        "home",
        "about",
        "chatbot",
        "history",
        "settings",
        "adminDashboard",
        "contact"
    ];

    sectionIds.forEach((id) => {
        const section = document.getElementById(id);
        if (section) section.hidden = true;
    });

    // Show only the selected main section.
    if (sectionIds.includes(route.slice(1))) {
        const selectedSection = document.getElementById(route.slice(1));
        if (selectedSection) selectedSection.hidden = false;
    }

    // Show the authentication area only for authentication routes.
    if (authenticationSection) {
        authenticationSection.hidden = !authRoutes.includes(route);
    }

    document.querySelectorAll(
        "#signup, #login, #forgot-password, #reset-password"
    ).forEach((card) => {
        card.hidden = `#${card.id}` !== route;
    });

    // Update profile information.
    if (route === "#settings" && loggedIn) {
        if (settingsName) {
            settingsName.textContent =
                currentUser.name || currentUser.full_name || "Not available";
        }

    if (settingsEmail) {
        settingsEmail.textContent =
            currentUser.email || "Not available";
    }

    if (settingsRole) {
        settingsRole.textContent =
            currentUser.role || "Not available";
    }
}

    // Update navigation visibility based on the user's role.
    if (historyNav) historyNav.hidden = !loggedIn;
    if (settingsNav) settingsNav.hidden = !loggedIn;
    if (adminDashboardNav) adminDashboardNav.hidden = !isAdmin;

    // History is visible only when its section is selected.
    if (historySection) {
        historySection.hidden = !loggedIn || route !== "#history";
    }

    // Keep the chatbot's login prompt and form synchronized.
    if (loginRequired) {
        loginRequired.hidden = loggedIn;
    }

    if (simulatorContent) {
        simulatorContent.hidden = !loggedIn;
    }

    // Load dashboard data only when an admin opens that section.
    if (route === "#adminDashboard" && isAdmin) {
        loadAdminDashboard();
    }
}




/* SIGN UP AND LOGIN NAVIGATION */

if (signupNav) {
    signupNav.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.hash = "#signup";
    });
}

if (loginNav) {
    loginNav.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.hash = "#login";
    });
}

window.addEventListener("hashchange", showCurrentScreen);



// -----------------------------------------------
// 3. CHECK LOGIN STATUS
// -----------------------------------------------

async function checkLoginStatus() {

    try {

        const response = await fetch("/auth/me", {
            credentials: "same-origin"
        });

        if (response.ok) {

            currentUser = await response.json();

        } else {

            currentUser = null;
        }

    } catch (error) {

        console.error("Login status error:", error);

        currentUser = null;
    }
    updateAuthenticationUI();

    if (currentUser) {
        await loadConversationHistory();
    }
}


// -----------------------------------------------
// 4. GOOGLE RECAPTCHA
// -----------------------------------------------

async function initializeRecaptcha() {

    try {

        const response = await fetch("/config/recaptcha");

        const data = await readResponse(response);

        if (!data.site_key) {
            throw new Error("reCAPTCHA site key is missing.");
        }

        await new Promise((resolve, reject) => {

            let attempts = 0;

            const timer = setInterval(() => {

                attempts++;

                if (
                    window.grecaptcha &&
                    typeof window.grecaptcha.render === "function"
                ) {

                    clearInterval(timer);
                    resolve();
                }

                if (attempts >= 50) {

                    clearInterval(timer);

                    reject(
                        new Error("Google reCAPTCHA could not load.")
                    );
                }

            }, 200);
        });

        captchaWidgetId = window.grecaptcha.render(
            "recaptchaContainer",
            {
                sitekey: data.site_key
            }
        );

    } catch (error) {

        console.error("reCAPTCHA error:", error);

        signupMessage.textContent =
            "Unable to load CAPTCHA. Please refresh the page.";
    }
}


// -----------------------------------------------
// 5. SIGN UP
// -----------------------------------------------

signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    signupMessage.textContent = "";

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();

    const password =
        document.getElementById("signupPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {

        signupMessage.textContent = "Passwords do not match.";
        return;
    }

    if (captchaWidgetId === null) {

        signupMessage.textContent =
            "CAPTCHA is not ready. Please refresh the page.";

        return;
    }

    const captchaToken =
        window.grecaptcha.getResponse(captchaWidgetId);

    if (!captchaToken) {

        signupMessage.textContent =
            "Please complete the I'm not a robot verification.";

        return;
    }

    const submitBtn =
        signupForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Account...";

    try {

        const response = await fetch("/auth/signup", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                confirm_password: confirmPassword,
                captcha_token: captchaToken
            })
        });

        await readResponse(response);

        signupMessage.textContent =
            "Account created successfully! Please log in.";

        signupForm.reset();

        window.grecaptcha.reset(captchaWidgetId);

        window.location.hash = "#login";

    } catch (error) {

        signupMessage.textContent = "Error: " + error.message;

        if (captchaWidgetId !== null) {
            window.grecaptcha.reset(captchaWidgetId);
        }

    } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
    }
});


// -----------------------------------------------
// 6. LOGIN
// -----------------------------------------------

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    loginMessage.textContent = "";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const submitBtn =
        loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging In...";

    try {

        const response = await fetch("/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await readResponse(response);

        currentUser = data.user;

        updateAuthenticationUI();

        loginForm.reset();

        await loadConversationHistory();

        window.location.hash = "#chatbot";

    } catch (error) {

        loginMessage.textContent = "Error: " + error.message;

    } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
    }
});


// -----------------------------------------------
// 7. LOGOUT
// -----------------------------------------------

logoutBtn.addEventListener("click", async function () {

    try {

        const response = await fetch("/auth/logout", {

            method: "POST",
            credentials: "same-origin"
        });

        await readResponse(response);

        currentUser = null;

        updateAuthenticationUI();

        window.location.hash = "#home";

    } catch (error) {

        alert("Logout failed: " + error.message);
    }
});

if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener("click", () => {
        const existingLogoutButton =
            document.getElementById("logoutBtn");

        if (existingLogoutButton) {
            existingLogoutButton.click();
        }
    });
}



// -----------------------------------------------
// 8. DISPLAY AI CONVERSATION
// -----------------------------------------------

function displayConversation(data) {

    clearConversation();

    conversationData = data;

    if (!Array.isArray(data.conversation)) {

        statusText.textContent =
            "Invalid conversation data received.";

        return;
    }

    data.conversation.forEach((message, index) => {

        const messageDiv = document.createElement("div");

        messageDiv.className = "message";

        if (index % 2 !== 0) {
            messageDiv.classList.add("persona-two");
        }

        const speaker = document.createElement("h4");

        speaker.textContent =
            `Turn ${index + 1}: ${message.speaker || "Stakeholder"}`;

        const messageText = document.createElement("p");

        messageText.textContent = message.message || "";

        messageDiv.appendChild(speaker);
        messageDiv.appendChild(messageText);

        conversationOutput.appendChild(messageDiv);
    });

    finalAgreement.textContent =
        data.final_agreement || "No final agreement generated.";

    if (Array.isArray(data.action_plan)) {

        data.action_plan.forEach((step) => {

            const li = document.createElement("li");

            li.textContent = String(step);

            actionPlan.appendChild(li);
        });
    }

    agreementSection.hidden = false;
}


// -----------------------------------------------
// 9. GENERATE AI CONVERSATION
// -----------------------------------------------

generateBtn.addEventListener("click", async function () {

    if (!currentUser) {

        statusText.textContent =
            "Please log in to generate a conversation.";

        return;
    }

    const topic = document.getElementById("topic").value.trim();
    const persona1 = document.getElementById("persona1").value.trim();
    const persona2 = document.getElementById("persona2").value.trim();

    const turns = Number(
        document.getElementById("turns").value
    );

    if (!topic || !persona1 || !persona2) {

        statusText.textContent = "Please fill in all fields.";
        return;
    }

    if (
        topic.length < 3 ||
        persona1.length < 2 ||
        persona2.length < 2
    ) {

        statusText.textContent =
            "Please enter valid topic and persona names.";

        return;
    }

    clearConversation();

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating Conversation...";

    statusText.textContent =
        "Gemini AI is generating the discussion. Please wait...";

    try {

        const response = await fetch("/generate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "same-origin",

            body: JSON.stringify({
                topic: topic,
                persona1: persona1,
                persona2: persona2,
                turns: turns
            })
        });

        if (response.status === 401) {

            currentUser = null;
            updateAuthenticationUI();

            throw new Error(
                "Your session has expired. Please log in again."
            );
        }

        const data = await readResponse(response);

        displayConversation(data);

        statusText.textContent =
            "Conversation generated successfully!";

        await loadConversationHistory();

        conversationOutput.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        console.error("Fiscal Fusion Error:", error);

        statusText.textContent = "Error: " + error.message;

    } finally {

        generateBtn.disabled = false;

        generateBtn.textContent =
            "✨ Generate AI Conversation";
    }
});


// -----------------------------------------------
// 10. LOAD CONVERSATION HISTORY
// -----------------------------------------------

async function loadConversationHistory() {

    if (!currentUser) {
        return;
    }

    historyStatus.textContent = "Loading conversations...";

    historyList.innerHTML = "";

    try {

        const response = await fetch("/history", {
            credentials: "same-origin"
        });

        const data = await readResponse(response);

        const conversations = Array.isArray(data)
            ? data
            : data.conversations;

        if (!Array.isArray(conversations)) {

            throw new Error(
                "Invalid history response received."
            );
        }

        historyStatus.textContent = "";

        if (conversations.length === 0) {

            historyStatus.textContent =
                "No saved conversations yet. Generate your first conversation!";

            return;
        }

        conversations.forEach((conversation, index) => {

            const card = document.createElement("div");

            card.className = "history-card";

            const title = document.createElement("h3");

            title.textContent =
                conversation.title || `Conversation ${index + 1}`;

            const topic = document.createElement("p");

            topic.textContent =
                `Topic: ${conversation.topic || "Financial Discussion"}`;

            const personas = document.createElement("p");

            personas.textContent =
                `Personas: ${conversation.persona1 || ""} & ${conversation.persona2 || ""}`;

            const viewButton = document.createElement("button");

            viewButton.type = "button";
            viewButton.textContent = "👁 View Conversation";

            viewButton.addEventListener("click", async function () {

                await viewSavedConversation(conversation.id);
            });

            card.appendChild(title);
            card.appendChild(topic);
            card.appendChild(personas);
            card.appendChild(viewButton);

            historyList.appendChild(card);
        });

    } catch (error) {

        historyStatus.textContent =
            "Unable to load history: " + error.message;
    }
}


// -----------------------------------------------
// 11. VIEW SAVED CONVERSATION
// -----------------------------------------------

async function viewSavedConversation(conversationId) {

    try {

        const response = await fetch(
            `/history/${encodeURIComponent(conversationId)}`,
            {
                credentials: "same-origin"
            }
        );

        const data = await readResponse(response);

        // Supports a response containing either
        // the result directly or a nested result object.

        let savedConversation = data;

        if (data.result) {

            savedConversation = data.result;

        } else if (data.result_json) {

            savedConversation =
                typeof data.result_json === "string"
                    ? JSON.parse(data.result_json)
                    : data.result_json;
        }

        if (!Array.isArray(savedConversation.conversation)) {

            throw new Error(
                "Saved conversation format is invalid."
            );
        }

        displayConversation(savedConversation);

        statusText.textContent =
            "Saved conversation loaded successfully!";

        window.location.hash = "#chatbot";

        conversationOutput.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        alert(
            "Unable to open saved conversation: " + error.message
        );
    }
}


// -----------------------------------------------
// 12. REFRESH HISTORY
// -----------------------------------------------

refreshHistoryBtn.addEventListener("click", async function () {

    await loadConversationHistory();
});


// -----------------------------------------------
// 13. DOWNLOAD CONVERSATION
// -----------------------------------------------

downloadBtn.addEventListener("click", function () {

    if (!conversationData) {

        alert("Please generate or open a conversation first.");
        return;
    }

    let transcript = "FISCAL FUSION\n";

    transcript +=
        "Building Chatbots in Financial Services (Gen AI)\n";

    transcript +=
        "============================================\n\n";

    transcript += "AI GENERATED CONVERSATION\n\n";

    conversationData.conversation.forEach((message, index) => {

        transcript += `Turn ${index + 1}\n`;

        transcript += `Speaker: ${message.speaker}\n`;

        transcript += `Message: ${message.message}\n\n`;
    });

    transcript += "\nFINAL AGREEMENT\n";

    transcript +=
        "============================================\n";

    transcript +=
        (conversationData.final_agreement || "") + "\n\n";

    transcript += "ACTION PLAN\n";

    transcript +=
        "============================================\n";

    if (Array.isArray(conversationData.action_plan)) {

        conversationData.action_plan.forEach((step, index) => {

            transcript += `${index + 1}. ${step}\n`;
        });
    }

    const blob = new Blob([transcript], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "Fiscal_Fusion_Conversation.txt";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
});


// -----------------------------------------------
// 14. INITIALIZE APPLICATION
// -----------------------------------------------


document.addEventListener("DOMContentLoaded", async function () {

    showCurrentScreen();

    await checkLoginStatus();

    // Initialize reCAPTCHA for users who are not logged in.
    if (!currentUser) {
        await initializeRecaptcha();
    }
});


/* FORGOT PASSWORD FUNCTIONALITY */

const backToLoginLink = document.getElementById("backToLoginLink");
const forgotPasswordCard = document.getElementById("forgot-password");
const loginCard = document.getElementById("login");
const signupCard = document.getElementById("signup");

if (forgotPasswordLink) {
    
    forgotPasswordLink.addEventListener("click", function (event) {
        event.preventDefault();

        forgotPasswordMessage.textContent = "";
        window.location.hash = "#forgot-password";
    });

}

if (backToLoginLink) {
    
    backToLoginLink.addEventListener("click", function (event) {
        event.preventDefault();

        loginMessage.textContent = "";
        window.location.hash = "#login";
    });

}

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        forgotPasswordMessage.textContent = "Sending reset link...";
        forgotPasswordMessage.style.color = "";

        const email = forgotPasswordEmail.value.trim();

        try {
            const response = await fetch("/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (response.ok) {
                forgotPasswordMessage.textContent =
                    data.message ||
                    "If an account exists for this email, a password reset link has been sent.";
                forgotPasswordMessage.style.color = "green";
            } else {
                forgotPasswordMessage.textContent =
                    data.detail || "Unable to process your request. Please try again.";
                forgotPasswordMessage.style.color = "red";
            }
        } catch (error) {
            forgotPasswordMessage.textContent =
                "Unable to connect to the server. Please try again.";
            forgotPasswordMessage.style.color = "red";
        }
    });
}

/* RESET PASSWORD FUNCTIONALITY */


function showResetPasswordCard() {
    window.location.hash = "#reset-password";
}

function getResetToken() {
    return new URLSearchParams(window.location.search).get("token");
}


if (window.location.pathname === "/reset-password") {
    window.location.hash = "#reset-password";
    showResetPasswordCard();
}


if (resetBackToLoginLink) {
    resetBackToLoginLink.addEventListener("click", function (event) {
        event.preventDefault();

        resetPasswordCard.hidden = true;
        document.getElementById("signup").hidden = true;
        document.getElementById("login").hidden = false;
        resetPasswordMessage.textContent = "";
    });
}

if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const token = getResetToken();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmNewPasswordInput.value;

        if (!token) {
            resetPasswordMessage.textContent =
                "Reset token is missing. Please request a new reset link.";
            resetPasswordMessage.style.color = "red";
            return;
        }

        if (newPassword !== confirmPassword) {
            resetPasswordMessage.textContent =
                "Passwords do not match. Please try again.";
            resetPasswordMessage.style.color = "red";
            return;
        }

        resetPasswordMessage.textContent = "Resetting password...";
        resetPasswordMessage.style.color = "";

        try {
            const response = await fetch("/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                resetPasswordMessage.textContent =
                    data.message || "Password reset successfully! You can now log in.";
                resetPasswordMessage.style.color = "green";
                resetPasswordForm.reset();
            } else {
                resetPasswordMessage.textContent =
                    typeof data.detail === "string"
                        ? data.detail
                        : "Unable to reset password. Please request a new reset link.";
                resetPasswordMessage.style.color = "red";
            }
        } catch (error) {
            resetPasswordMessage.textContent =
                "Unable to connect to the server. Please try again.";
            resetPasswordMessage.style.color = "red";
        }
    });
}

/* SHOW / HIDE PASSWORD */


/* SHOW / HIDE PASSWORD */

document.querySelectorAll(".toggle-password").forEach(function (button) {
    button.addEventListener("click", function () {
        const targetId = button.dataset.target;
        const passwordInput = document.getElementById(targetId);

        if (!passwordInput) return;

        const icon = button.querySelector(".eye-icon");
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";

        button.setAttribute("aria-pressed", String(isHidden));
        button.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );

        if (icon) {
            icon.textContent = isHidden ? "🙈" : "👁";
        } else {
            button.textContent = isHidden ? "🙈" : "👁";
        }
    });
});


/* ===============================================
   ADMIN DASHBOARD
   =============================================== */

async function loadAdminDashboard() {
    if (
        !currentUser ||
        String(currentUser.role || "").toLowerCase() !== "admin"
    ) {
        return;
    }

    adminDashboardStatus.textContent = "Loading dashboard...";
    refreshAdminBtn.disabled = true;

    try {
        const [statsResponse, usersResponse, activityResponse] =
            await Promise.all([
                fetch("/admin/stats", {
                    credentials: "same-origin"
                }),
                fetch("/admin/users", {
                    credentials: "same-origin"
                }),
                fetch("/admin/activity", {
                    credentials: "same-origin"
                })
            ]);

        const [stats, usersData, activityData] = await Promise.all([
            readResponse(statsResponse),
            readResponse(usersResponse),
            readResponse(activityResponse)
        ]);

        // Update statistics.
        adminTotalUsers.textContent = stats.total_users ?? 0;
        adminTotalConversations.textContent =
            stats.total_conversations ?? 0;
        adminTotalLogins.textContent = stats.total_logins ?? 0;
        adminTotalLogouts.textContent = stats.total_logouts ?? 0;

        // Display registered users.
        adminUsersBody.replaceChildren();

        const users = usersData.users || [];

        if (users.length === 0) {
            addAdminTableMessage(
                adminUsersBody,
                6,
                "No registered users."
            );
        } else {
            users.forEach((user) => {
                const row = document.createElement("tr");

                appendAdminCell(row, user.id);
                appendAdminCell(row, user.name);
                appendAdminCell(row, user.email);
                appendAdminCell(row, user.role);
                appendAdminCell(
                    row,
                    formatAdminDate(user.registered_at)
                );

                // Role-management column.
                const manageCell = document.createElement("td");

                if (Number(user.id) === Number(currentUser.id)) {
                    // Prevent changing your own role in the UI.
                    const currentAccount = document.createElement("span");
                    currentAccount.textContent = "Current account";
                    manageCell.appendChild(currentAccount);
                } else {
                    const roleSelect = document.createElement("select");
                    roleSelect.setAttribute(
                        "aria-label",
                        `Change role for ${user.name}`
                    );

                    [
                        { value: "user", label: "User" },
                        { value: "admin", label: "Admin" }
                    ].forEach((optionData) => {
                        const option = document.createElement("option");
                        option.value = optionData.value;
                        option.textContent = optionData.label;
                        roleSelect.appendChild(option);
                    });

                    const normalizedRole =
                        String(user.role || "user").toLowerCase();

                    roleSelect.value =
                        normalizedRole === "admin" ? "admin" : "user";

                    const saveButton = document.createElement("button");
                    saveButton.type = "button";
                    saveButton.textContent = "Save Role";

                    saveButton.addEventListener("click", async () => {
                        const newRole = roleSelect.value;

                        if (newRole === normalizedRole) {
                            adminDashboardStatus.textContent =
                                "No role changes to save.";
                            return;
                        }

                        const confirmed = window.confirm(
                            `Change ${user.name}'s role to ${newRole}?`
                        );

                        if (!confirmed) {
                            return;
                        }

                        saveButton.disabled = true;
                        roleSelect.disabled = true;
                        saveButton.textContent = "Saving...";

                        try {
                            const response = await fetch(
                                `/admin/users/${encodeURIComponent(user.id)}/role`,
                                {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    credentials: "same-origin",
                                    body: JSON.stringify({
                                        role: newRole
                                    })
                                }
                            );

                            const result = await readResponse(response);

                            adminDashboardStatus.textContent =
                                result.message ||
                                "User role updated successfully.";

                            // Reload users and statistics.
                            await loadAdminDashboard();

                        } catch (error) {
                            adminDashboardStatus.textContent =
                                "Unable to update role: " + error.message;

                            saveButton.disabled = false;
                            roleSelect.disabled = false;
                            saveButton.textContent = "Save Role";
                        }
                    });

                    manageCell.appendChild(roleSelect);
                    manageCell.appendChild(saveButton);
                }

                row.appendChild(manageCell);
                adminUsersBody.appendChild(row);
            });
        }

        // Display recent login/logout activity.
        adminActivityBody.replaceChildren();

        const activities = activityData.activities || [];

        if (activities.length === 0) {
            addAdminTableMessage(
                adminActivityBody,
                4,
                "No activity recorded yet."
            );
        } else {
            activities.forEach((activity) => {
                const row = document.createElement("tr");

                appendAdminCell(row, activity.user_name);
                appendAdminCell(row, activity.user_email);

                const eventCell = document.createElement("td");
                const eventBadge = document.createElement("span");

                eventBadge.className =
                    "admin-event-" +
                    String(activity.event_type || "unknown").toLowerCase();

                eventBadge.textContent =
                    activity.event_type || "Unknown";

                eventCell.appendChild(eventBadge);
                row.appendChild(eventCell);

                appendAdminCell(
                    row,
                    formatAdminDate(activity.timestamp)
                );

                adminActivityBody.appendChild(row);
            });
        }

        adminDashboardStatus.textContent = "";

    } catch (error) {
        console.error("Admin dashboard error:", error);

        adminDashboardStatus.textContent =
            "Unable to load dashboard: " + error.message;
    } finally {
        refreshAdminBtn.disabled = false;
    }
}

function appendAdminCell(row, value) {
    const cell = document.createElement("td");

    cell.textContent =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);

    row.appendChild(cell);
}

function addAdminTableMessage(tbody, columnCount, message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = columnCount;
    cell.textContent = message;

    row.appendChild(cell);
    tbody.appendChild(row);
}

function formatAdminDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

if (refreshAdminBtn) {
    refreshAdminBtn.addEventListener("click", loadAdminDashboard);
}
