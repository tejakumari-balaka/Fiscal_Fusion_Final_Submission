# Fiscal Fusion: Building Chatbots in Financial Services (Gen AI)

## 1. Project Overview

Fiscal Fusion is a Generative AI-powered web application that simulates professional conversations between two stakeholders in the financial services industry.

The application uses Google's Gemini API to generate context-aware discussions, explore different professional perspectives, reach a mutual agreement, and create an actionable plan. It also includes user authentication, password recovery, role-based access control, and conversation history.

## 2. Project Objectives

- Demonstrate the use of Generative AI in financial services.
- Simulate discussions between two financial stakeholders.
- Support secure user registration and login.
- Provide email-based password recovery and reset functionality.
- Implement Role-Based Access Control (RBAC) to restrict access according to user roles.
- Save and retrieve previously generated conversations.
- Generate agreements and practical action plans.

## 3. Features

- **User Registration and Login:** Users can create accounts and log in to access the application.
- **reCAPTCHA Verification:** Registration includes CAPTCHA verification to help prevent automated submissions.
- **Forgot Password:** Users can request a password recovery link through their registered email address.
- **Password Reset:** Users can securely set a new password using a time-limited reset link.
- **Role-Based Access Control (RBAC):** Access to protected features is restricted according to assigned user roles.
- **Admin Dashboard:** Authorized administrators can access administrative dashboard functionality.
- **AI-Powered Conversations:** Generate discussions using Google's Gemini API.
- **Customizable Personas:** Define two stakeholders with different professional roles.
- **Configurable Conversation Turns:** Select the number of turns in the discussion.
- **Mutual Agreement:** Generate a concluding agreement based on the conversation.
- **Action Plan:** Produce practical next steps.
- **Conversation History:** View previously saved conversations.
- **User-Specific History:** Authenticated users can access their own saved conversations.
- **Transcript Download:** Download generated conversations for future reference.
- **Database Integration:** Store user and conversation data using SQLite and SQLAlchemy.
- **Profile and Logout:** View registered account details and securely end the current session.

## 4. Technologies Used

- Python
- FastAPI
- Google Gemini API
- SQLite
- SQLAlchemy
- HTML
- CSS
- JavaScript
- Pydantic
- itsdangerous
- pwdlib
- Argon2
- Uvicorn
- Google reCAPTCHA
- SMTP email integration

## 5. Example Use Case

**Topic:** Fraud Detection and Banking Security

**Stakeholder 1:** Bank Security Manager

**Stakeholder 2:** Customer Experience Manager

The stakeholders discuss fraud prevention, banking security, customer convenience, and possible solutions. The application generates an alternating conversation, a final agreement, and an action plan.

## 6. Project Structure

```text
Fiscal_Fusion/
├── static/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── .gitignore
├── auth.py
├── database.py
├── email_service.py
├── fiscal_fusion.db
├── fiscal_fusion_backup.db
├── Fiscal_Fusion.code-workspace
├── init_db.py
├── main.py
├── migrate_password_reset.py
├── migrate_rbac.py
├── models.py
├── README.md
├── requirements.txt
├── security.py
├── setup_admin.py
└── test_email.py
```

**Local development files:** The `.env` file, virtual environment (`venv/`), and Python cache (`__pycache__/`) are excluded from the main project listing because they should not normally be committed to version control.

**Database files:** SQLite databases are created and used locally by the application. Do not publish them if they contain user accounts, password hashes, reset information, or conversation history.

## 7. Prerequisites

- Python 3.10 or a compatible version supported by the installed dependencies.
- A Google Gemini API key.
- Visual Studio Code or another code editor.
- An internet connection for Gemini API and email requests.
- Google reCAPTCHA keys.
- SMTP credentials if email delivery is configured through Gmail.

## 8. Installation and Setup

### Step 1: Open the Project Folder

Open the `Fiscal_Fusion` project folder in Visual Studio Code.

### Step 2: Create a Virtual Environment

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
venv\Scripts\Activate.ps1
```

Alternatively, use Command Prompt:

```bat
venv\Scripts\activate.bat
```

### Step 3: Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create a `.env` file in the project root directory using `.env.example` as a reference.

Configure the Gemini API key, reCAPTCHA keys, email settings, and any other environment variables required by the application.

Example:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Use the exact variable names expected by your application code.

**Security note:** Never upload your actual `.env` file, API keys, email passwords, or other secrets to GitHub. Keep `.env.example` limited to placeholder values.

### Step 5: Initialize the Database

If database initialization is not performed automatically, run:

```bash
python init_db.py
```

### Step 6: Start the Application

```bash
python -m uvicorn main:app --reload
```

### Step 7: Open the Website

Visit:

http://localhost:8000

Use the hostname expected by your local reCAPTCHA configuration.

## 9. How to Use the Application

1. Open the website in your browser.
2. Register a new account and complete CAPTCHA verification.
3. Log in using your registered credentials.
4. If you forget your password, open **Forgot Password** and request a reset link.
5. Open the reset link received by email and set a new password.
6. Enter a financial services discussion topic.
7. Define the two stakeholder personas.
8. Select the desired number of conversation turns.
9. Generate and review the stakeholder discussion.
10. Review the final agreement and action plan.
11. Open conversation history to access saved discussions.
12. Download a transcript when needed.
13. Open Profile & Settings to view account details.
14. Log out when you finish.

Administrators can access authorized administrative features according to their assigned role.

## 10. Authentication and Role-Based Access Control

### Authentication

Authentication verifies the user's identity before granting access to protected application features.

Fiscal Fusion includes:

- User registration and login.
- Password hashing.
- Session-cookie-based authentication.
- Forgot Password and email-based password reset.
- Logout functionality.

### Role-Based Access Control (RBAC)

RBAC restricts access to protected resources according to the user's assigned role.

For example:

- **Standard User:** Can access the chatbot, generate conversations, view their own history, and download transcripts.
- **Administrator:** Can access protected administrative functionality, including the admin dashboard.

The backend must enforce these permissions; hiding interface elements alone is not sufficient security. User-specific conversation history must also be protected so users cannot access another user's records.

## 11. Security Considerations

- Store API keys and secret values in environment variables.
- Keep `.env` excluded from version control.
- Hash passwords rather than storing them in plain text.
- Validate reset tokens and enforce their expiration and single-use behavior.
- Protect authenticated endpoints.
- Enforce administrative permissions on the backend.
- Restrict conversation history to the appropriate user.
- Avoid exposing sensitive account information in error messages.
- Use HTTPS and secure cookie settings when deploying to production.
- Never publish API credentials, reset tokens, or email passwords.

## 12. Expected Output

The application provides:

- An authenticated web interface.
- AI-generated conversations between two financial stakeholders.
- A final mutual agreement.
- A practical action plan.
- Saved conversation history.
- Downloadable conversation transcripts.
- Email-based password recovery.
- Role-restricted administrative functionality.

## 13. Limitations

Fiscal Fusion is an academic Generative AI conversation simulator. It does not execute banking transactions, access live bank accounts, or independently detect real financial fraud. Generated responses may require human review.

## 14. Conclusion

Fiscal Fusion demonstrates how Generative AI can support stakeholder communication, collaboration, and decision-making in financial services. By combining a FastAPI backend, Gemini API integration, user authentication, password recovery, role-based access control, SQLite storage, and a web-based interface, the project provides a practical example of an AI-powered financial discussion application.
