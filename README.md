# CoPrompt - AI Collaborative Decision Making

CoPrompt enables teams to collaboratively analyze business ideas using AI. The Product Owner presents an idea, invites domain experts (Marketing, Risk, Tech, Finance, Legal, Operations), and each expert gets AI-generated analysis from their perspective. The system then synthesizes all insights into a balanced recommendation.

## 🚀 Setup Instructions for Collaborators

### Prerequisites
- Node.js 18+ installed
- Anthropic API key from https://console.anthropic.com

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/CoPrompt.git
cd CoPrompt
```

2. **Create .env file in root directory:**
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=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
PORT=3001
VITE_API_URL=http://localhost:3001
```

3. **Install backend dependencies:**
```bash
cd backend
npm install
```

4. **Install frontend dependencies:**
```bash
cd ../frontend
npm install
```

5. **Start backend** (Terminal 1):
```bash
cd backend
npm start
```

6. **Start frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

7. **Open browser:** http://localhost:5173

## 📁 Project Structure
```
CoPrompt/
├── backend/          # Express API server (proxies to Claude API)
├── frontend/         # React + Vite application
├── .env             # Environment variables (git-ignored)
├── .env.example     # Template for setup
└── README.md        # This file
```

## 💰 API Costs

Uses Claude 3 Haiku model:
- ~$0.25 per million input tokens
- ~$1.25 per million output tokens
- Typical session: $0.05-0.15
- $5 credit ≈ 30-100 sessions

## 🔐 Security

⚠️ **NEVER commit your .env file!**
- Each collaborator needs their own API key
- Keep the repository private if sharing API keys

## 📞 Support

Questions? Contact: dijjer@gmail.com