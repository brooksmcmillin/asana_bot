// NOTE: apiKey, workspaceGid, and assigneeGid defined in Credentials.gs file

var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
var baseURL = "https://app.asana.com/api/1.0"

var now = new Date();
// Add one day to exclude tasks that were completed today
now.setDate(now.getDate() + 1);
var now_string = dateToDateTimeString(now);
var now_date_string = dateToDateString(now);

function dateToDateTimeString(date) {
  return dateToDateString(date) + "T" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
}

function dateToDateString(date) {
  return date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
}

function sendRequest(endpoint, params="{}") {
  var headers = {"Authorization": "Bearer " + apiKey};
  var options = {
    "headers": headers,
  };

  var response = UrlFetchApp.fetch(baseURL + endpoint, options);
  return JSON.parse(response.getContentText())["data"];
}

function getTags() {
  var tags = {};

  var result = sendRequest("/tags");

  for(const index in result) {
    item = result[index];
    tags[item["gid"]] = item["name"];
  }

  return tags;
}

function getOpenTasks() {
  const all_tags = getTags();
  var open_tasks = [];

  var result = sendRequest("/tasks?workspace=" + workspaceGid +
    "&assignee=" + assigneeGid +
    "&completed_since=" + now_string +
    "&opt_fields=name,tags,due_on"
  );

  for (const index in result) {
    var item = result[index];
    var item_tags = [];

    // Get English tag names instead of GIDs
    for( const tag_index in item["tags"]) {
      const tag = item["tags"][tag_index];
      item_tags.push(all_tags[tag["gid"]]);
    }

    item["tags"] = item_tags;
    open_tasks.push(item);
  }

  return open_tasks;
}

// Seems to order by due date ascending by default. Not sure if that is related to Asana settings?
function getDueTasks(dateString) {
  const openTasks = getOpenTasks();
  var dueTasks = [];

  for (const index in openTasks) {
    const task = openTasks[index];
    if(task["due_on"] && task["due_on"] <= dateString) {
      dueTasks.push(task);
    }
  }

  return dueTasks;
}

// Get tasks as a dictonary keyed on first tag
// Most of my tasks only have one tag, so this is more easily handled
// If multiple tags are used, this will probably have to be adjusted
function groupTasksByTag(tasks) {
  var groupedTasks = {};
  for (const index in tasks) {
    const task = tasks[index];
    const tag = task["tags"][0];
    if (tag in groupedTasks) {
      groupedTasks[tag].push(task);
    }
    else {
      groupedTasks[tag] = [task];
    }
  }

  return groupedTasks;
}

// In my spreadsheet, this function is triggered by a button (Insert Drawing + Attach Function call)
function writeTasks(dateString, groupByTag=true) {
  const startColumn = 5; // E Column
  const startRow = 6;
  var dueTasks = getDueTasks(dateString);

  // TODO: Make this more dependent on startColumn / startRow variables
  // Clears max of 45 tasks. I (hopefully) shouldn't have more than that in a day. 
  sheet.getRange("E6:G50").removeCheckboxes();
  sheet.getRange("E6:G50").clearContent();

  if (groupByTag) {
    var rowsPrinted = 0;
    dueTasks = groupTasksByTag(dueTasks);

    for (const tag in dueTasks) {
      sheet.getRange(startRow + rowsPrinted, startColumn).setValue(tag).setFontWeight("bold");
      rowsPrinted++;

      for (const index in dueTasks[tag]) {
        const task = dueTasks[tag][index];
        sheet.getRange(startRow + rowsPrinted, startColumn).insertCheckboxes();
        sheet.getRange(startRow + rowsPrinted, startColumn + 1).setValue(task["name"]);
        // I put this on startColumn+3 so I can see it in the worksheet
        // but it won't get printed out
        sheet.getRange(startRow + rowsPrinted, startColumn + 3).setValue(task["due_on"]);
        rowsPrinted++;
      }
    }
  }

  else {
  
    for (const index in dueTasks) {
      sheet.getRange(startRow + parseInt(index), startColumn).insertCheckboxes();
      sheet.getRange(startRow + parseInt(index), startColumn + 1).setValue(dueTasks[index]["name"]);
      sheet.getRange(startRow + parseInt(index), startColumn + 2).setValue(dueTasks[index]["due_on"]);
    }
  }
}

function getTodaysTasks() {
  var today = new Date();
  writeTasks(dateToDateString(today));
  console.log(dateToDateString(today));
}

// This will also get any of today's tasks that haven't been completed yet
function getTomorrowsTasks() {
  var today = new Date();
  today.setDate(today.getDate() + 1);
  writeTasks(dateToDateString(today));
  console.log(dateToDateString(today));
}
