# Life Dashboard Project Guidance

## Purpose
Build a modern, minimal personal To-Do List Life Dashboard for the CodingCamp assignment.

## Required stack and constraints
- Use semantic HTML, CSS, and vanilla JavaScript only.
- Do not use frontend frameworks or a backend server.
- Persist tasks, quick links, user name, theme, and focus duration with the browser Local Storage API.
- Keep exactly one CSS file in `css/` and one JavaScript file in `js/`.
- Support current versions of Chrome, Firefox, Edge, and Safari.
- Keep the interface responsive, accessible, and easy to understand.

## Required MVP
- Show current time-of-day greeting, date, and clock-related information.
- Provide a focus timer with a 25-minute default and start, stop/pause, and reset controls.
- Allow adding, editing, completing, and deleting tasks.
- Save tasks to Local Storage.
- Provide quick links that open favorite websites and persist in Local Storage.

## Selected challenges
1. Light / dark mode.
2. Custom name in greeting.
3. Change Pomodoro time.
4. Prevent duplicate tasks.
5. Sort tasks.

All five challenges are implemented, exceeding the required three.

## Code conventions
- Use clear names and small functions.
- Escape user-provided strings before inserting them into HTML.
- Keep persistence and UI rendering in the single `js/app.js` file.
- Do not add backend dependencies.
