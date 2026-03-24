# Google Login Setup

These are the remaining Google-side steps before deployment.

If you are deploying today without Google login, leave the Google env vars blank for now. The app will still run, and users will see a soft notice that Gmail/SMS verification will be required soon.

## 1. Create a Google OAuth Web Client

In Google Cloud Console:
1. Create or select a project
2. Configure the OAuth consent screen
3. Create an OAuth 2.0 Client ID of type `Web application`

## 2. Add Authorized Origins

For local:
- `http://localhost:3000`

For production:
- `https://app.your-domain.com`

## 3. Set Matching Environment Variables

Frontend:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_web_client_id
```

Backend:

```env
GOOGLE_OAUTH_CLIENT_ID=your_google_web_client_id
```

These two values must match.

## 4. Make Sure Frontend and Backend URLs Match Production

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
FRONTEND_BASE_URL=https://app.your-domain.com
ALLOWED_HOSTS=api.your-domain.com
CSRF_TRUSTED_ORIGINS=https://app.your-domain.com
CORS_ALLOWED_ORIGINS=https://app.your-domain.com
```

## 5. Smoke Test After Deploy

1. Open the landing page
2. Click `Login`
3. Use Google sign-in
4. Confirm login succeeds
5. Confirm a new Google-registered user is placed into the approval flow
6. Confirm admin approval email arrives
7. Approve the user
8. Login again and confirm access to the app
