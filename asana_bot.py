from credentials import api_key, workspace_gid, assignee_gid

import asana
import datetime

now = datetime.datetime.strftime(datetime.datetime.now(), "%Y-%m-%dT%H:%M:%S")
now_date = datetime.datetime.strftime(datetime.datetime.now(), "%Y-%m-%d")

client = asana.Client.access_token(api_key)

def get_tags():
    global client

    tags = {}
    
    result = client.tags.get_tags({"workspace": workspace_gid}, opt_pretty=True)

    for item in result:
        tags[item["gid"]] = item["name"]

    return tags

def get_open_tasks():
    global client 

    all_tags = get_tags()

    open_tasks = []
    task_result = client.tasks.get_tasks({"assignee": assignee_gid, "workspace": workspace_gid, "completed_since": now}, opt_pretty=True, fields=["name", "tags", "due_on", "memberships.section.name"])
    for item in task_result:
        
        # Put English Tag names in tag field instead of GIDs
        item_tags = []
        for tag in item["tags"]:
            item_tags.append(all_tags[tag["gid"]])

        # Get the section name out of the tree (assuming tasks are in 1 or 0 sections)
        if item["memberships"] == []:
            item["section"] = "None"
        else:
            item["section"] = item["memberships"][0]["section"]["name"]

        item["tags"] = item_tags
            
        open_tasks.append(item)

    return open_tasks

# Get tasks that are due today, or earlier
def get_due_tasks():
    open_tasks = get_open_tasks()

    due_tasks = []
    for task in open_tasks:
        if task["due_on"] and task["due_on"] <= now_date:
            due_tasks.append(task)

    return due_tasks


if __name__ == "__main__":
    # Get and print all due tasks (tasks with due date today or earlier)
    due_tasks = get_due_tasks()
    for task in due_tasks:
        print(task)



