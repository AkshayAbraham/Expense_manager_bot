function getScriptProperties() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var sheetId = scriptProperties.getProperty('SHEET_ID');
  var botToken = scriptProperties.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = scriptProperties.getProperty('TELEGRAM_CHAT_ID');
  return { sheetId, botToken, chatId };
}

function doPost(e) {
  var properties = getScriptProperties();  // Get script properties
  var SHEET_ID = properties.sheetId;
  var TELEGRAM_BOT_TOKEN = properties.botToken;
  var TELEGRAM_CHAT_ID = properties.chatId;

  var contents = JSON.parse(e.postData.contents);
  var message = contents.message;
  
  if (!message || !message.text) {
    return;
  }

  var chat_id = message.chat.id;
  var sender_name = message.from.first_name;
  var text = message.text.trim();
  var parts = text.split("+");

  // Handle "generate current month report" command
  if (text === "generate current month report") {
    sendCurrentMonthReport(chat_id);
    return;
  }

  // Handle "generate current month report+month+year" command
  if (text.startsWith("generate monthly report+")) {
    var parts = text.split("+");
    if (parts.length === 3) {
      var selectedMonth = parts[1] + " " + parts[2]; // Combine month and year
      sendMonthlyReport(chat_id, selectedMonth);
    } else {
      sendMessage(chat_id, "⚠️ Invalid format. Please use: generate monthly report+month+year");
    }
    return;
  }

  // Handle "generate overall report" command
  if (text === "generate overall report") {
    sendOverallReport(chat_id);
    return;
  }
  
  // Add Recurring Payment (e.g., recurring+rent+200)
  if (parts[0].toLowerCase() === "recurring") {
    var paymentType = parts[1].toLowerCase();
    var amount = parseFloat(parts[2]);

    if (isNaN(amount)) {
      sendMessage(chat_id, "⚠️ Invalid amount. Please enter a valid price.");
      return;
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("RecurringPayments");
    
    // Add to RecurringPayments table with separate date and time
    var currentDate = new Date();
    var date = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
    var time = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "HH:mm:ss");
    sheet.appendRow([date, time, sender_name, paymentType, amount, "Active"]);

    // Color the row based on the month
    colorRowBasedOnMonth(sheet);

    sendMessage(chat_id, `✅ Recorded: ${sender_name} has added a recurring payment for ${paymentType} of £${amount}.`);
    return;
  }
  

// Delete Recurring Payment (e.g., delete+hen+19)
if (parts[0].toLowerCase() === "delete") {
  var paymentTypeToDelete = parts[1].toLowerCase().trim(); // The item (e.g., "mug")
  var amountToDelete = parseFloat(parts[2]);

  // Log the input parameters for debugging
  Logger.log(`Attempting to delete: Item: '${paymentTypeToDelete}', Amount: ${amountToDelete}`);

  if (isNaN(amountToDelete)) {
    sendMessage(chat_id, "⚠️ Invalid amount. Please enter a valid price to delete.");
    return;
  }

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("RecurringPayments");
  var data = sheet.getDataRange().getValues();
  var found = false;

  // Loop through the rows to find and delete the recurring payment
  for (var i = 1; i < data.length; i++) {
    var name = (data[i][2] || "").toString().trim().toLowerCase(); // Column 3: Name (e.g., "Akshay")
    var item = (data[i][3] || "").toString().trim().toLowerCase(); // Column 4: Item (e.g., "mug")
    var amount = parseFloat(data[i][4]); // Column 5: Amount
    var status = (data[i][5] || "").toString().trim().toLowerCase(); // Column 6: Status (Active/Completed)

    // Log each row's values for debugging
    Logger.log(`Row ${i} - Name: '${name}', Item: '${item}', Amount: ${amount}, Status: '${status}'`);

    // Validate if the amount is a number
    if (isNaN(amount)) {
      Logger.log(`Invalid amount in row ${i}: ${data[i][4]}`);
      continue; // Skip the row if amount is not valid
    }

    // If payment item and amount match, mark as completed and add end date/time
    if (item === paymentTypeToDelete && amount === amountToDelete && status === "active") {
      Logger.log(`Found matching recurring payment: Row ${i}, Marking as Completed`);

      // Mark as completed (Column 6 for Status)
      sheet.getRange(i + 1, 6).setValue("Completed");

      // Add end date and time in the next column (Column 7)
      var currentDate = new Date();
      var endDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
      var endTime = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "HH:mm:ss");
      sheet.getRange(i + 1, 7).setValue(`${endDate} ${endTime}`);

      found = true;
      break;
    }
  }

  if (found) {
    sendMessage(chat_id, `✅ Deleted: ${sender_name} has marked the recurring payment for ${paymentTypeToDelete} of £${amountToDelete} as completed.`);
  } else {
    sendMessage(chat_id, "⚠️ No matching recurring payment found to delete.");
  }

  return;
}

  // Handle regular expenses (e.g., "Coffee 5")
  var parts = text.split(" ");
  if (parts.length < 2) {
    sendMessage(chat_id, "⚠️ Please enter expense in the format: Item Price\nExample: Coffee 5");
    return;
  }

  var item = parts.slice(0, -1).join(" ");  // Everything except last part
  var price = parseFloat(parts[parts.length - 1]);  // Last part as price
  
  if (isNaN(price)) {
    sendMessage(chat_id, "⚠️ Invalid amount. Please enter a valid price.");
    return;
  }
  
  var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  
  // Add regular expense with separate date and time
  var currentDate = new Date();
  var date = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
  var time = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "HH:mm:ss");
  
  sheet.appendRow([date, time, sender_name, item, price, "Expense"]);

  // Color the row based on the month
  colorRowBasedOnMonth(sheet);

  sendMessage(chat_id, `✅ Recorded: ${sender_name} bought ${item} for £${price}`);
}

// Send message to Telegram chat
function sendMessage(chat_id, text) {
  var properties = getScriptProperties();  // Get script properties
  var TELEGRAM_BOT_TOKEN = properties.botToken;
  
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    chat_id: chat_id,
    text: text
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(url, options);
}

// Function to color a row based on the month
function colorRowBasedOnMonth(sheet) {
  var lastRow = sheet.getLastRow();
  var currentDate = new Date();
  var month = currentDate.getMonth();  // Current month (0 to 11)
  var year = currentDate.getFullYear();  // Current year (e.g., 2024)

  var row = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn());  // Get the last added row
  var dateValue = row.getCell(1, 1).getValue();
  var rowMonth = dateValue.getMonth();
  var rowYear = dateValue.getFullYear();

  // Define colors for each month
  var monthColors = {
    0: "#FFDDC1",  // January: Light Red
    1: "#FFE4B5",  // February: Light Yellow
    2: "#E6E6FA",  // March: Light Blue
    3: "#FFFACD",  // April: Light Lemon
    4: "#E0FFFF",  // May: Light Cyan
    5: "#F0E68C",  // June: Khaki
    6: "#FFB6C1",  // July: Light Pink
    7: "#98FB98",  // August: Pale Green
    8: "#DDA0DD",  // September: Plum
    9: "#FFA07A",  // October: Light Salmon
    10: "#B0E0E6", // November: Powder Blue
    11: "#FFDAB9"  // December: Peach Puff
  };

  // Set color based on the month and year
  if (rowMonth === month && rowYear === year) {
    row.setBackground("#c7e7c7"); // Green for current month
  } else {
    // Use the predefined color for the row's month
    var color = monthColors[rowMonth] || "#FFFFFF"; // Default to white if month is not in the map
    row.setBackground(color);
  }
}

// Calculate monthly expenses and recurring payments, then send summary
function calculateAndSendSummary() {
  var properties = getScriptProperties();  // Get script properties
  var SHEET_ID = properties.sheetId;
  var TELEGRAM_CHAT_ID = properties.chatId;

  // Open the Sheet1 and RecurringPayments sheets
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Sheet1"); // Regular expenses
  var recurringSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("RecurringPayments"); // Recurring payments

  // Log sheet names for debugging
  Logger.log("Sheet1: " + sheet.getName());
  Logger.log("RecurringPayments Sheet: " + recurringSheet.getName());

  // Get data from both sheets
  var data = sheet.getDataRange().getValues();
  var recurringData = recurringSheet.getDataRange().getValues();

  var totals = {};
  var recurring = {};

  // Loop through each row in the Sheet1 (Expenses)
  for (var i = 1; i < data.length; i++) {
    var name = data[i][2];  // Column 3: Name
    var amount = data[i][4]; // Column 5: Amount
    var type = data[i][5];  // Column 6: Type (Expense or Recurring)

    // Handle regular expenses
    if (type === "Expense") {
      if (!totals[name]) {
        totals[name] = 0;
      }
      totals[name] += amount;
    }
  }

  // Loop through each row in the RecurringPayments sheet
  for (var i = 1; i < recurringData.length; i++) {
    var name = recurringData[i][2];  // Column 3: Name
    var amount = recurringData[i][4]; // Column 5: Amount
    var status = recurringData[i][5]; // Column 6: Status (Active/Completed)

    // Handle active recurring payments
    if (status === "Active") {
      if (!recurring[name]) {
        recurring[name] = 0;
      }
      recurring[name] += amount;  // Sum up active recurring payments for each person
    }
  }

  var names = Object.keys(totals);
  if (names.length !== 2) {
    sendMessage(TELEGRAM_CHAT_ID, "⚠️ Error: This script works only for two people.");
    return;
  }

  var person1 = names[0], person2 = names[1];
  var total1 = totals[person1] + (recurring[person1] || 0);
  var total2 = totals[person2] + (recurring[person2] || 0);
  var avg = (total1 + total2) / 2;
  var msg = `📊 *Monthly Expense Summary* 📊\n\n${person1} spent: £${total1}\n${person2} spent: £${total2}\n\nEach should pay: £${avg}\n`;

  if (total1 > total2) {
    msg += `💰 ${person2} should pay £${(total1 - avg).toFixed(2)} to ${person1}`;
  } else if (total2 > total1) {
    msg += `💰 ${person1} should pay £${(total2 - avg).toFixed(2)} to ${person2}`;
  } else {
    msg += "✅ Both have spent equally. No need to settle!";
  }

  sendMessage(TELEGRAM_CHAT_ID, msg);

  // Now call appendMonthlyReport with required data
  appendMonthlyReport(person1, total1, person2, total2, avg, data, totals, recurring);
}

// Function to generate monthly report
function appendMonthlyReport(person1, total1, person2, total2, avg, data, totals, recurring) {
  var properties = getScriptProperties();  // Get script properties
  var SHEET_ID = properties.sheetId;  // Retrieve the sheet ID here
  var sheet = SpreadsheetApp.openById(SHEET_ID);
  var reportSheet = sheet.getSheetByName("MonthlyReport");

  // If the report sheet does not exist, create it
  if (!reportSheet) {
    reportSheet = sheet.insertSheet("MonthlyReport");
    reportSheet.appendRow(["Month", "Start Date", "End Date", "Name", "Total Spent", "Total Expenses", "Total Recurring Payments", "Average Spending", "Balance/Settlement", "Amount to Pay"]);
  }

  // Calculate the necessary values for person1
  var total1_expenses = totals[person1] || 0; // Expenses for person1
  var total1_recurring = recurring[person1] || 0; // Recurring payments for person1
  var balance1 = total1 - avg;
  var amountToPay1 = balance1 > 0 ? balance1 : 0; // Amount to pay for person1

  // Calculate the necessary values for person2
  var total2_expenses = totals[person2] || 0; // Expenses for person2
  var total2_recurring = recurring[person2] || 0; // Recurring payments for person2
  var balance2 = total2 - avg;
  var amountToPay2 = balance2 > 0 ? balance2 : 0; // Amount to pay for person2

  // Get the date range (start and end date) from the data
  var firstDate = new Date(data[1][0]); // Assuming the first row has date in column 1
  var lastDate = new Date(data[data.length - 1][0]); // Last date from the last row

  // Format the dates to MM/DD/YYYY format
  var startDate = Utilities.formatDate(firstDate, Session.getScriptTimeZone(), "MM/dd/yyyy");
  var endDate = Utilities.formatDate(lastDate, Session.getScriptTimeZone(), "MM/dd/yyyy");

  // Get the month name for the report
  var month = Utilities.formatDate(firstDate, Session.getScriptTimeZone(), "MMMM yyyy");

  // Append the results to the report sheet
  reportSheet.appendRow([month, startDate, endDate, person1, total1, total1_expenses, total1_recurring, avg, balance1, amountToPay1]);
  reportSheet.appendRow([month, startDate, endDate, person2, total2, total2_expenses, total2_recurring, avg, balance2, amountToPay2]);

  // Add color coding based on month
  var row1 = reportSheet.getRange(reportSheet.getLastRow() - 1, 1, 1, 10);
  var row2 = reportSheet.getRange(reportSheet.getLastRow(), 1, 1, 10);

  var monthColor = getMonthColor(month);

  row1.setBackground(monthColor);
  row2.setBackground(monthColor);
}

// Helper function to return color based on the month
function getMonthColor(month) {
  var colors = {
    "January": "#FFDDC1",  // Light Red
    "February": "#FFE4B5", // Light Yellow
    "March": "#E6E6FA",    // Light Blue
    "April": "#FFFACD",    // Light Lemon
    "May": "#E0FFFF",      // Light Cyan
    "June": "#F0E68C",     // Khaki
    "July": "#FFB6C1",     // Light Pink
    "August": "#98FB98",   // Pale Green
    "September": "#DDA0DD", // Plum
    "October": "#FFA07A",  // Light Salmon
    "November": "#B0E0E6", // Powder Blue
    "December": "#FFDAB9"  // Peach Puff
  };

  // Extract the month name from the full month string (e.g., "October 2023" -> "October")
  var monthName = month.split(" ")[0];

  return colors[monthName] || "#FFFFFF"; // Default to white if the month is not in the color map
}

// Trigger to send the summary at the end of each month
function setupTrigger() {
  ScriptApp.newTrigger("calculateAndSendSummary")
    .timeBased()
    .onMonthDay(1)  // Runs on the 1st of every month
    .atHour(10)     // Runs at 10 AM
    .create();
}

function showReportOptions(chat_id) {
  var properties = getScriptProperties();
  var TELEGRAM_BOT_TOKEN = properties.botToken;
  
  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    chat_id: chat_id,
    text: "📊 *Choose a Report Type:*",
    reply_markup: {
      keyboard: [
        [{ text: "📅 Current Month Report" }],
        [{ text: "📊 Monthly Report" }],
        [{ text: "📑 Overall Report" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    },
    parse_mode: "Markdown"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

function handleReportRequest(chat_id, reportType) {
  if (reportType === "report_current") {
    sendCurrentMonthReport(chat_id);
  } else if (reportType === "report_monthly") {
    askForMonthSelection(chat_id);
  } else if (reportType === "report_overall") {
    sendOverallReport(chat_id);
  }
}

function sendCurrentMonthReport(chat_id) {
  var properties = getScriptProperties();
  var SHEET_ID = properties.sheetId;
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("Sheet1");
  var recurringSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("RecurringPayments");

  var currentMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy");
  var data = sheet.getDataRange().getValues();
  var recurringData = recurringSheet.getDataRange().getValues();

  var report = `📅 *Current Month Report: ${currentMonth}*\n\n`;
  var totals = {};

  // Calculate expenses from Sheet1
  for (var i = 1; i < data.length; i++) {
    var date = new Date(data[i][0]); 
    var month = Utilities.formatDate(date, Session.getScriptTimeZone(), "MMMM yyyy");
    var name = data[i][2]; 
    var amount = parseFloat(data[i][4]); 

    if (month === currentMonth) {
      if (!totals[name]) totals[name] = 0;
      totals[name] += amount;
    }
  }

  // Add active recurring payments
  for (var i = 1; i < recurringData.length; i++) {
    var date = new Date(recurringData[i][0]);
    var month = Utilities.formatDate(date, Session.getScriptTimeZone(), "MMMM yyyy");
    var name = recurringData[i][2];
    var amount = parseFloat(recurringData[i][4]);
    var status = recurringData[i][5].toLowerCase();

    if (month === currentMonth && status === "active") {
      if (!totals[name]) totals[name] = 0;
      totals[name] += amount;
    }
  }

  // Check if there are exactly two people
  var names = Object.keys(totals);
  if (names.length !== 2) {
    report += "⚠️ This report works only for two people.";
    sendMessage(chat_id, report);
    return;
  }

  var person1 = names[0];
  var person2 = names[1];
  var total1 = totals[person1];
  var total2 = totals[person2];

  // Calculate average spending
  var avg = (total1 + total2) / 2;

  // Add individual totals to the report
  report += `👤 ${person1} spent: 💰 £${total1.toFixed(2)}\n`;
  report += `👤 ${person2} spent: 💰 £${total2.toFixed(2)}\n\n`;
  report += `💡 **Each should spend: 💰 £${avg.toFixed(2)}**\n\n`;

  // Calculate who owes whom
  if (total1 > avg) {
    var amountOwed = total1 - avg;
    report += `💰 **${person2} should pay ${person1}: 💰 £${amountOwed.toFixed(2)}**`;
  } else if (total2 > avg) {
    var amountOwed = total2 - avg;
    report += `💰 **${person1} should pay ${person2}: 💰 £${amountOwed.toFixed(2)}**`;
  } else {
    report += "✅ **Both have spent equally. No need to settle!**";
  }

  sendMessage(chat_id, report);
}


function askForMonthSelection(chat_id) {
  var properties = getScriptProperties();
  var TELEGRAM_BOT_TOKEN = properties.botToken;

  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    chat_id: chat_id,
    text: "📊 *Select a Month for the Report:*",
    reply_markup: {
      keyboard: [
        [{ text: "January 2025" }, { text: "February 2025" }],
        [{ text: "March 2025" }, { text: "April 2025" }],
        [{ text: "May 2025" }, { text: "June 2025" }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    },
    parse_mode: "Markdown"
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}

function sendMonthlyReport(chat_id, selectedMonth) {
  var properties = getScriptProperties();
  var SHEET_ID = properties.sheetId;
  var monthlyReportSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("MonthlyReport");

  // Get all data from the MonthlyReport sheet
  var data = monthlyReportSheet.getDataRange().getValues();

  var report = `📅 *Report for ${selectedMonth}*\n\n`;
  var totals = {};
  var balances = {};

  // Log the selected month for debugging
  Logger.log(`Selected Month: ${selectedMonth}`);

  // Loop through the rows in the MonthlyReport sheet
  for (var i = 1; i < data.length; i++) {
    var month = data[i][0]; // Column 1: Month (date object)
    var formattedMonth = Utilities.formatDate(month, Session.getScriptTimeZone(), "MMMM yyyy"); // Format as "Month Year"
    var name = data[i][3]; // Column 4: Name
    var totalSpent = parseFloat(data[i][4]); // Column 5: Total Spent
    var balance = parseFloat(data[i][8]); // Column 9: Balance
    var amountToPay = parseFloat(data[i][9]); // Column 10: Amount to Pay

    // Log each row's data for debugging
    Logger.log(`Row ${i}: Month: ${formattedMonth}, Name: ${name}, Total Spent: ${totalSpent}, Balance: ${balance}, Amount to Pay: ${amountToPay}`);

    // Check if the row belongs to the selected month
    if (formattedMonth === selectedMonth) {
      totals[name] = totalSpent; // Store total spent by each person
      balances[name] = { balance: balance, amountToPay: amountToPay }; // Store balance and amount to pay
    }
  }

  // Log the totals and balances for debugging
  Logger.log(`Totals: ${JSON.stringify(totals)}`);
  Logger.log(`Balances: ${JSON.stringify(balances)}`);

  // Check if there are exactly two people
  var names = Object.keys(totals);
  if (names.length !== 2) {
    report += "⚠️ This report works only for two people.";
    sendMessage(chat_id, report);
    return;
  }

  var person1 = names[0];
  var person2 = names[1];
  var total1 = totals[person1];
  var total2 = totals[person2];

  // Add individual totals to the report
  report += `👤 ${person1} spent: 💰 £${total1.toFixed(2)}\n`;
  report += `👤 ${person2} spent: 💰 £${total2.toFixed(2)}\n\n`;

  // Calculate who owes whom
  if (balances[person1].amountToPay > 0) {
    report += `💰 **${person2} should pay ${person1}: 💰 £${balances[person1].amountToPay.toFixed(2)}**`;
  } else if (balances[person2].amountToPay > 0) {
    report += `💰 **${person1} should pay ${person2}: 💰 £${balances[person2].amountToPay.toFixed(2)}**`;
  } else {
    report += "✅ **Both have spent equally. No need to settle!**";
  }

  sendMessage(chat_id, report);
}


function sendOverallReport(chat_id) {
  var properties = getScriptProperties();
  var SHEET_ID = properties.sheetId;
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("MonthlyReport");

  var data = sheet.getDataRange().getValues();
  var report = `📑 **Overall Expense Report**\n\n`;

  var totals = {};

  for (var i = 1; i < data.length; i++) {
    var person = data[i][3];  // Name
    var amount = parseFloat(data[i][4]);  // Total Spent

    if (!totals[person]) {
      totals[person] = 0;
    }
    totals[person] += amount;
  }

  for (var name in totals) {
    report += `👤 ${name} - 💰 $${totals[name].toFixed(2)}\n`;
  }

  sendMessage(chat_id, report);
}


// Call this to test the function immediately
function testCalculateAndSendSummary() {
  calculateAndSendSummary();
}

function testReports() {
  var testChatId = "-4653094900"; // Replace with a valid chat ID for testing

  sendCurrentMonthReport(testChatId);  // Test Current Month Report
  sendMonthlyReport(testChatId, "March 2025"); // Test a specific Monthly Report
  sendOverallReport(testChatId);  // Test Overall Report
}


