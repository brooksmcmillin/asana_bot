// NOTE: apiKey, workspaceGid, and assigneeGid defined in Credentials.gs file

var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
var baseURL = "https://app.asana.com/api/1.0"

var now = new Date();
// Add one day to exclude tasks that were completed today
now.setDate(now.getDate() + 1);
var now_string = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2) + "T" + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
var now_date_string = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2)

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
function getDueTasks() {
  const openTasks = getOpenTasks();
  var dueTasks = [];

  for (const index in openTasks) {
    const task = openTasks[index];
    if(task["due_on"] && task["due_on"] <= now_date_string) {
      dueTasks.push(task);
    }
  }

  return dueTasks;
}

// In my spreadsheet, this function is triggered by a button (Insert Drawing + Attach Function call)
function main() {
  const startColumn = 7; // G Column
  const startRow = 5;
  const dueTasks = getDueTasks();
  console.log(dueTasks);

  // TODO: Make this more dependent on startColumn / startRow variables
  // Clears max of 45 tasks. I (hopefully) shouldn't have more than that in a day. 
  sheet.getRange("G5:I50").removeCheckboxes();
  sheet.getRange("G5:I50").clearContent();
  // sheet.getRange("G5:I50").co
  
  for (const index in dueTasks) {
    sheet.getRange(startRow + parseInt(index), startColumn).insertCheckboxes();
    sheet.getRange(startRow + parseInt(index), startColumn + 1).setValue(dueTasks[index]["name"]);
    sheet.getRange(startRow + parseInt(index), startColumn + 2).setValue(dueTasks[index]["due_on"]);
  }
  
}
