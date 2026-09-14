# Tasklane — Product Specification

## Application name

Tasklane

## Product purpose

Tasklane is a clean, modern, minimalist personal Kanban board. It gives users a simple visual workflow to capture tasks, prioritize them, track progress, and understand what still needs attention without unnecessary complexity.

## Target users

Individual students, solo professionals, and other people managing personal tasks. The product is not tied specifically to school or work.

## Problems solved

- Tasks are scattered and difficult to track.
- Users cannot easily tell what needs attention, what is in progress, or what is complete.
- Users need prioritization and progress tracking without a complex project-management tool.

## Board structure and statuses

Tasklane has one permanent personal board with four columns:

- To Do
- In Progress
- Blocked — tasks waiting on something or with an unresolved issue.
- Done

Tasks may move freely between all statuses. Users can also manually reorder tasks within a column with drag and drop. Status and position changes must persist.

## Task fields

| Field | Rules |
| --- | --- |
| Title | Required; trimmed value must be non-empty and at most 120 characters. Show a clear validation message when invalid. |
| Description | Optional. |
| Priority | Optional: Low, Medium, or High. |
| Due date | Optional, date-only, interpreted in the user's local calendar day. |
| Status | Defaults to To Do on creation; may be changed to any board status. |
| Creation date | Generated automatically; never changes. |
| Last updated date | Generated automatically; updates whenever a task is edited or its status changes. |

## Core user flows

### Create a task

1. The user selects the option to create a task.
2. A modal/dialog opens.
3. The user enters a valid title and optionally enters description, priority, and due date.
4. The task is created in To Do and appears on the board.

### View and edit a task

1. The user clicks a task card on the board.
2. The task details modal/dialog opens.
3. The user can view and edit title, description, priority, due date, and status.
4. Saving changes updates the task and its last updated date while preserving its creation date.

### Move and reorder a task

1. The user drags a task to another status column, or changes status in the task modal/dialog.
2. The task status and last updated date are updated.
3. The user may drag tasks to reorder them within a column.
4. The resulting status and ordering persist after refresh.

### Delete a task

1. The user chooses to delete a task from its details modal/dialog.
2. Tasklane requests confirmation.
3. Only a confirmed action permanently deletes the task.

### Search and filter tasks

1. The user searches text in task titles and descriptions.
2. The user may combine status, priority, and due-date filters.
3. The board shows only tasks matching every active search/filter criterion.

## Search and filter behavior

- Search matches text in both title and description.
- Filters are available for status and priority.
- Due-date filter options are: All dates, Overdue, Today, Upcoming, and No due date.
- Multiple filters can be active at the same time.

## Priority and due-date behavior

- Show clear labels for Low, Medium, and High priority.
- High priority must be more visually prominent without overwhelming the interface.
- Show a due date on each task card when one is set.
- An incomplete task with a due date before the current local calendar date displays a clear Overdue indicator.
- Done tasks are never marked overdue.

## Loading, empty, and error states

- While tasks load, show skeleton cards or a clear loading indicator.
- With no tasks, show a friendly empty state and an option to create the first task.
- With active search/filters but no matches, show a clear “No matching tasks” message and an option to clear filters.
- If a task request fails, show a clear error message and a way to retry the operation.

## Data persistence requirements

- Tasks must persist after a browser refresh.
- A backend and database store task data; browser-local storage is not the persistence mechanism.
- The frontend treats the backend as the source of truth for task data.

## High-level responsibilities

### Frontend

- Render the single Kanban board, task cards, task modal/dialog, search, filters, and user-feedback states.
- Support drag-and-drop movement and reordering.
- Send task operations to the backend and render backend-confirmed task data.

### Backend

- Provide the task data and task operations required by the board.
- Validate task titles and maintain automatic creation/last-updated dates.
- Persist tasks, statuses, and within-column ordering in the database.

## Non-goals and out-of-scope features

- Authentication or user accounts
- Teams, shared boards, or collaboration
- Multiple boards or lists
- Real-time updates
- Payments
- Notifications
- AI features
- Separate task-details pages

## Acceptance criteria

- A user can create a task with a valid title; it defaults to To Do.
- A user can view and edit a task in a modal/dialog without leaving the board.
- A user can update title, description, priority, due date, and status; creation date remains unchanged and last updated date changes after edits or status changes.
- A user can move a task between any statuses via drag-and-drop or the status selector.
- A user can reorder tasks within a status column via drag-and-drop.
- A user must confirm before a task is permanently deleted.
- Search considers task titles and descriptions; status, priority, and due-date filters work together.
- Due-date filters support All dates, Overdue, Today, Upcoming, and No due date.
- Incomplete past-due tasks show an overdue indicator; Done tasks do not.
- Loading, no-task, no-match, and request-error states are clearly represented with the specified actions.
- Task data, statuses, and order persist after refresh through the backend and database.
