# AI Meeting Minutes To Task Converter

## Overview

AI Meeting Minutes To Task Converter is a web application that leverages AI to extract actionable tasks from meeting transcripts. Users can paste their meeting transcript, and the app will automatically identify and organize tasks, assign them to team members, set due dates, and prioritize them. This streamlines the process of turning meeting discussions into clear, trackable action items.

**Key Features:**
- Paste meeting transcripts and extract tasks with a single click
- Automatic task assignment, due dates, and prioritization
- Task management interface with status tracking and editing
- Modern, user-friendly UI

---

## Setup Instructions

### Prerequisites
- Node.js (v18 or above recommended)
- npm (v9 or above recommended)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd AI-Meeting-Minutes-To-Task-Converter
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or the port shown in your terminal).

---

## Example Output

Below is a screenshot of the app in action, showing how meeting transcripts are converted into actionable tasks:

![App Screenshot](attached_assets/image_1749808838053.png)

---

## Project Structure
- `client/` - Frontend React app
- `server/` - Backend Express server
- `shared/` - Shared code and types
- `attached_assets/` - Screenshots and other assets

---

## License
MIT 