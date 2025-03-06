# Expense Manager Bot (Google Sheets + Telegram Bot)

## Description
A smart expense tracking system that uses **Google Apps Script** and **Google Sheets** to log and manage expenses efficiently. Users interact with a **Telegram bot** to add expenses, track recurring payments, and receive automated monthly reports, ensuring better financial management.

## Problem Statement
Manually tracking expenses can be tedious and prone to errors. People often forget to log transactions, track recurring payments, or review their spending habits, leading to poor financial planning.

## Solution
This expense tracker simplifies the process by integrating **Google Sheets** with a **Telegram bot**:
- Users can log expenses directly through **Telegram**.
- The bot automatically updates **Google Sheets**.
- It tracks **recurring expenses**.
- Monthly reports are generated and sent via **Telegram notifications**.

## Technology Stack
- **Google Apps Script** (Backend logic & Google Sheets integration)
- **Google Sheets** (Database for storing expenses)
- **Telegram Bot API** (User interaction & notifications)
- **Google Cloud Services** (for automation & scheduling)

## Workflow
1. **User Interaction via Telegram Bot**
   - Add a new expense (`/<category> <amount> `)
   - Delete an expense (`/delete+<category>+<amount>`)
   - Track recurring payments (`/recurring+<category>+<amount> `)
   - Generate current month’s report (`/generate current month report `)
   - Generate a specific month’s report (`/generate monthly report+<month>+<year>`)
   - Generate overall report (`/Generate overall report`)

2. **Google Apps Script Processing**
   - Stores the data in **Google Sheets**.
   - Automatically calculates total spending, balance, and recurring expenses.

3. **Automated Notifications via Telegram**
   - Sends **monthly spending reports**.
   - Alerts users if they exceed their budget.

## Features
✔ **Google Sheets Integration** – Expenses are stored and managed in Google Sheets.  
✔ **Telegram Bot for Easy Input** – Users can log expenses quickly via chat commands.  
✔ **Recurring Expenses Management** – Tracks and notifies about subscriptions, rent, etc.  
✔ **Automated Monthly Reports** – Sent via Telegram to help users analyze spending.  

## Future Scope
- **Graphical Reports** – Generate and send charts/graphs of spending trends.
- **Multi-User Support** – Allow multiple users to track expenses separately.
- **Budget Goals & AI Insights** – Suggest savings plans based on spending patterns.
- **Export Reports** – Provide CSV/PDF export options.

## How to Set Up
1. **Deploy Google Apps Script:**
   - Open [Google Apps Script](https://script.google.com/) and create a new project.
   - Copy and paste the provided script.
   - Link it to your **Google Sheet**.

2. **Create a Telegram Bot:**
   - Go to [BotFather](https://t.me/BotFather) on Telegram.
   - Create a new bot and get the API token.
   - Update the Google Apps Script with your bot token.

3. **Run the Script:**
   - Save and deploy the script as a web app.
   - Set up triggers for **automated reports** and notifications.

4. **Start Using the Bot!**
   - Add expenses, track spending, and receive alerts via Telegram.

---

This project makes **expense tracking simple and automated** using Google Sheets and Telegram. 🚀  
Feel free to contribute and improve!  
