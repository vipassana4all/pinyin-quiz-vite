# Telegram Mini App Setup Guide

## 1. Create Telegram Bot

1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Choose a name and username for your bot
4. Save the bot token

## 2. Set up Mini App

1. Message @BotFather again
2. Use `/newapp` command
3. Select your bot
4. Provide app details:
   - **Short Name**: `pinyinquiz` (or your choice)
   - **Title**: `Pinyin Quiz`
   - **Description**: `Learn Chinese pronunciation with interactive audio quizzes`
   - **Photo**: Upload a 640x360 image
   - **Web App URL**: Your deployed app URL (e.g., `https://yourapp.vercel.app`)

## 3. Deployment Options

### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Option B: Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Option C: GitHub Pages
```bash
npm run build
# Push dist/ folder to gh-pages branch
```

## 4. Test the Mini App

1. Open your bot in Telegram
2. Use `/start` command
3. Tap the "Open App" button
4. The app should load in Telegram WebView

## 5. Bot Commands (Optional)

Add these commands via @BotFather using `/setcommands`:

```
start - Start the Pinyin Quiz
help - Get help with the app
```

## 6. Environment Variables

No environment variables needed for basic functionality.

## 7. Features Working in Telegram

- ✅ Haptic feedback on button presses
- ✅ Back button integration
- ✅ Full-screen experience
- ✅ Theme adaptation
- ✅ Audio playback
- ✅ Touch-optimized interface

## 8. Testing

- Test in Telegram Desktop
- Test in Telegram Mobile (iOS/Android)
- Test in regular web browser
- Verify audio works in both environments