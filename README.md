# Web Highlighter & Knowledge Base

Highlight text on any webpage and save to your local knowledge base. Powered by OpenAI.

## Setup

### 1. Start the local server

```bash
cd server
npm install
npm start
```

Or on macOS, double-click `server/start.command`.

Server runs at `http://localhost:7749`.

### 2. Build the Web UI (first time only)

```bash
cd server/web
npm install
npm run build
```

### 3. Load the Chrome extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder

### 4. Configure API Key

Open `http://localhost:7749/settings` and enter your OpenAI API key.

## Usage

- **Select text** on any page → floating toolbar appears
- **解释这段话** — AI explains the selection (streaming)
- **生成知识卡片** — saves highlight + AI explanation as a card
- **记录我的看法** — adds your personal note to the highlight
- **加入知识库** — saves the highlight without AI

Click the **extension icon** to open the SidePanel with all highlights on the current page.

Open **http://localhost:7749** for the full knowledge library.
