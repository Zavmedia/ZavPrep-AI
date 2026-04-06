# ZenPrep AI - ZAV INFO TECH Exam Supporter

A production-ready exam preparation web app with AI-powered features, mock tests, and progress tracking.

---

## Features

- **Multi-Exam Selection** - Prepare for up to 3 exams simultaneously
- **AI-Powered Learning** - Claude Sonnet + Gemma 3 for intelligent tutoring
- **Mock Tests** - Timed practice with section navigation and review
- **Progress Tracking** - localStorage + Firebase cloud backup
- **Student Portal** - Re-login preserves your data
- **Teach Me** - Comprehensive study material for all topics
- **Ask Doubt** - AI tutor answers your questions
- **Malayalam Support** - Full Malayalam medium for Kerala PSC exams
- **Admin Panel** - Analytics dashboard for monitoring

---

## Supported Exams

| Category | Exams |
|----------|-------|
| SSC/Defence | SSC GD Constable |
| Banking | SBI PO Prelims |
| Civil Services | UPSC CSE Prelims |
| Kerala PSC (English) | LDC, LGS, VEO, HSA English, Degree Level, SI Police, General |
| AFCAT | Indian Air Force |

---

## Credentials

| Type | Value |
|------|-------|
| **Access Code** | `Dream_100%` |
| **Password** | `Success@hardwork%` |
| **Admin Code** | `zavan_admin_2026` |
| **Admin URL** | `https://your-app.vercel.app?admin=zavan_admin_2026` |

---

## Project Structure

```
zenprep-ai/
├── index.html          # Main HTML with embedded CSS
├── app-core.js         # Core logic, state, presets, question bank
├── app-ui.js           # UI rendering, event handlers
├── package.json        # Dependencies
├── vercel.json         # Vercel configuration
└── api/
    ├── auth.js         # Access control + password verification
    ├── profile.js      # Student profile storage
    ├── chat.js         # AI proxy (OpenRouter + Anthropic)
    ├── admin.js        # Analytics dashboard API
    ├── _memory.js      # Storage utilities
    └── _firebase.js    # Firebase Firestore REST helper
```

---

## Deployment

### Option 1: Vercel (Recommended)

#### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "ZenPrep AI v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zenprep-ai.git
git push -u origin main
```

#### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Add Environment Variables:

| Name | Value |
|------|-------|
| `APP_ACCESS_CODES` | `Dream_100%` |
| `APP_PASSWORD` | `Success@hardwork%` |
| `ADMIN_CODE` | `zavan_admin_2026` |
| `FIREBASE_PROJECT_ID` | `zavprep` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@zavprep.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | *(paste full private key)* |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `APP_BASE_URL` | `https://your-app.vercel.app` |
| `APP_RATE_LIMIT_PER_HOUR` | `80` |

5. Click **Deploy**

#### Step 3: Verify Deployment

```bash
# Test main app
curl https://your-app.vercel.app

# Test auth API
curl -X POST https://your-app.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"code":"Dream_100%","password":"Success@hardwork%"}'
# Expected: {"ok":true,"required":true}

# Test admin API
curl "https://your-app.vercel.app/api/admin?code=zavan_admin_2026"
# Expected: JSON analytics data
```

---

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## User Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. OPEN APP                                            │
│    ↓                                                   │
│ 2. ENTER ACCESS CREDENTIALS                            │
│    Access Code: Dream_100%                             │
│    Password: Success@hardwork%                          │
│    ↓                                                   │
│ 3. SELECT EXAMS (up to 3)                             │
│    ↓                                                   │
│ 4. ENTER NAME & CONFIRM                                │
│    ↓                                                   │
│ 5. DASHBOARD                                          │
│    ┌──────────────────────────────────────┐           │
│    │ Overview | Practice | Teach | Doubt  │           │
│    │ Progress | Mock Test                 │           │
│    └──────────────────────────────────────┘           │
│    ↓                                                   │
│ 6. START LEARNING                                     │
│    • Practice MCQs with instant feedback              │
│    • Get AI Teaching with Malayalam support           │
│    • Ask Doubts to AI tutor                           │
│    • Track Progress                                    │
│    • Take Timed Mock Tests                             │
└─────────────────────────────────────────────────────────┘
```

---

## Admin Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. OPEN ADMIN URL                                       │
│    https://your-app.vercel.app?admin=zavan_admin_2026  │
│    ↓                                                   │
│ 2. VIEW ANALYTICS                                      │
│    • Total Students                                    │
│    • Daily Active Users (14-day chart)                │
│    • Exam Distribution                                 │
│    • Recent Student Activity                          │
└─────────────────────────────────────────────────────────┘
```

---

## Exam Features

### SSC GD
- 80 questions, 160 marks, 60 minutes
- Sections: Reasoning, GK, Mathematics, English
- Negative marking: -0.5 per wrong answer

### UPSC CSE
- 100 questions, 200 marks, 2 hours
- Sections: History & Polity, Geography & Environment, Economy & Current Affairs
- Negative marking: -0.66 per wrong answer

### Kerala PSC
- 100 questions, 100 marks, 75 minutes
- Malayalam medium available (LDC, LGS, VEO)
- Negative marking: -0.33 per wrong answer

### SBI PO
- 100 questions, 100 marks, 60 minutes
- Section-locked navigation
- Negative marking: -0.25 per wrong answer

### AFCAT
- 100 questions, 300 marks, 2 hours
- 4 sections with +3/-1 marking scheme

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| AI not responding | Check `OPENROUTER_API_KEY` in environment variables |
| Progress not saving | Verify Firebase configuration in env |
| 401 errors | Ensure access codes match environment variables |
| Malayalam questions missing | Select Malayalam medium exam (LDC, LGS, VEO) |

---

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js API routes (Vercel Serverless)
- **Database**: Firebase Firestore + Memory fallback
- **AI**: Claude Sonnet 4 (Anthropic) + Gemma 3 27B (OpenRouter)
- **Hosting**: Vercel

---

## File Sizes

| File | Size | Lines |
|------|------|-------|
| app-core.js | 55 KB | 553 |
| app-ui.js | 34 KB | 665 |
| index.html | 11 KB | 142 |
| api/chat.js | 6 KB | 210 |
| api/_memory.js | 8 KB | 249 |
| api/_firebase.js | 5 KB | 156 |
| api/profile.js | 4.5 KB | 129 |
| api/admin.js | 4 KB | 139 |
| api/auth.js | 2.4 KB | 87 |

---

## Security Features

- Access code + password authentication
- Rate limiting (80 requests/hour per IP)
- Authorization header validation
- Input sanitization
- Firebase authentication via JWT

---

## License

Proprietary - ZAV INFO TECH / ZAVAN GROUP

---

Built with care for exam preparation excellence.
