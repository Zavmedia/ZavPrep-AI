# ZenPrep AI - Deployment Checklist

## Environment Variables Required (.env)

### Access Control (REQUIRED)
```
APP_ACCESS_CODES=Dream_100%          # Comma-separated student codes
APP_PASSWORD=Success@hardwork%       # Shared password for students
ADMIN_CODE=zavan_admin_2026          # Your admin panel access
```

### Firebase (REQUIRED for data persistence)
```
FIREBASE_PROJECT_ID=zavprep
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@zavprep.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=<your-private-key>
```

### AI Providers (REQUIRED for AI features)
```
OPENROUTER_API_KEY=sk-or-v1-...     # Free Gemma model
# ANTHROPIC_API_KEY=sk-ant-...      # Optional premium Claude
```

### Optional
```
APP_BASE_URL=https://your-domain.com
APP_RATE_LIMIT_PER_HOUR=80
```

## Deployment Platforms

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Local Testing
```bash
npm install
npm run dev
```

## Default Login Credentials
```
Access Code: Dream_100%
Password: Success@hardwork%
```

## Admin Panel Access
```
URL: https://yourdomain.com?admin=zavan_admin_2026
```

## Features Checklist

### Frontend
- [x] Auth screen with login form
- [x] Registration with multi-exam selection (up to 3)
- [x] Student Portal quick-access button
- [x] Dashboard with 6 tabs (Overview, Practice, Teach, Doubt, Progress, Mock)
- [x] Mock test with timer, section navigation, submit
- [x] Progress tracking and persistence
- [x] Logout and Reset functionality
- [x] Exam switching for multi-exam students

### Backend APIs
- [x] /api/auth - Authentication
- [x] /api/chat - AI chat (proxy to OpenRouter/Anthropic)
- [x] /api/profile - Student progress storage
- [x] /api/admin - Analytics dashboard

### Data Storage
- [x] Firebase Firestore for profiles
- [x] In-memory fallback if Firebase fails
- [x] LocalStorage for offline/backup
- [x] SessionStorage for session persistence

## Common Issues & Solutions

### "Cannot read property of undefined"
- Ensure all API calls check for null values
- Check browser console for specific errors

### "Firebase auth failed"
- Verify FIREBASE_PRIVATE_KEY is correctly formatted
- Ensure newlines are escaped as \n
- Check Firebase service account has Datastore permissions

### "AI unavailable"
- Check OPENROUTER_API_KEY is valid
- Verify API key has not exceeded rate limits
- Check network connectivity

### Progress not saving
- Verify Firebase credentials are correct
- Check browser allows localStorage
- Look at browser console for network errors

## Testing the App

### Test 1: Registration
1. Enter access code and password
2. Enter student name
3. Select 2-3 exams
4. Click Start Learning

### Test 2: Practice
1. Go to Practice tab
2. Click "Generate Questions"
3. Answer a few questions
4. Verify progress updates

### Test 3: Mock Test
1. Go to Mock Test tab
2. Click "Start Mock Test"
3. Answer some questions
4. Click Submit Mock
5. Verify results display

### Test 4: Data Persistence
1. Complete some practice questions
2. Refresh the page
3. Verify progress is restored

### Test 5: Re-login
1. Click Logout
2. Enter same credentials
3. Enter same name
4. Verify data is restored

## Support
For issues, check:
1. Browser console (F12)
2. Network tab for failed API calls
3. Server logs
