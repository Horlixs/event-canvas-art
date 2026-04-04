# Quick Start Guide - Admin Dashboard & Session Features

## Setup Steps

### 1. Environment Configuration
Add to your `.env` file:

```bash
REACT_APP_ADMIN_EMAIL=your-email@example.com
```

### 2. Access the Admin Dashboard
- **Navigate to:** `http://localhost:5173/admin` (or your deployment URL)
- **Requirements:** Must be logged in with the admin email
- **Alternative:** Click your profile → Admin Panel (shows only for admin user)

### 3. Test Template State Persistence

**Steps:**
1. Go to any published template: `/dp/any-slug`
2. Upload images to any placeholder areas
3. Modify text fields
4. Click "Download" button
5. If not logged in, sign in modal appears
6. Sign in with email or Google
7. ✅ You should stay on the template page with your selections intact
8. Complete the download

### 4. Verify Session Persistence

**Test that login persists across pages:**
1. Log out completely
2. Go to `/dp/template-slug`
3. Try to download → auth modal appears
4. Sign in with email
5. Navigate to `/dashboard`
6. ✅ You should be logged in and see your templates
7. Go to `/create`
8. ✅ Still logged in - no need to sign in again
9. Go to `/explore`
10. ✅ Still logged in

---

## Key Features Summary

### Admin Dashboard (`/admin`)

**Overview Tab:**
- View total users, templates, views, and downloads
- See top 5 performing templates
- Quick stats at a glance

**Users Tab:**
- List all users with templates
- View user IDs and creation dates

**Templates Tab:**
- Search all templates by name or slug
- View engagement metrics
- Delete templates (with confirmation)
- See public/private status

### Template Generator State Persistence (`/dp/:slug`)

**What Gets Saved:**
- ✅ User image selections for each placeholder
- ✅ Image crops and positions
- ✅ Text content changes

**How It Works:**
- Automatically saves to browser `sessionStorage`
- Survives page navigation
- Clears after 30 minutes of inactivity
- Cleared on successful download

### Global Session Persistence

**Authentication Behavior:**
- 🔒 Secure OAuth via Supabase
- 🌐 Session persists across entire app
- 📱 Works on desktop and mobile
- 🔄 Automatic session refresh
- 🚪 Single sign-out point

---

## Troubleshooting

### Admin Dashboard Not Accessible
**Problem:** Getting redirected to home page
**Solution:** 
1. Verify `VITE_ADMIN_EMAIL` is set correctly
2. Log out and sign back in
3. Check that your email matches the admin email exactly

### Template Images Not Persisting
**Problem:** Changes lost after sign-in
**Solution:**
1. Check browser `sessionStorage` (DevTools → Application → Session Storage)
2. Verify you're on the same template URL (e.g., `/dp/template-slug`)
3. Try clearing browser cache and test again

### Sign-In Not Persisting
**Problem:** Getting logged out on navigation
**Solution:**
1. Check Supabase is initialized correctly
2. Verify no ad blockers are interfering with Supabase APIs
3. Check browser cookies are enabled
4. Try signing in again

---

## Database Schema Notes

The implementation uses your existing:
- **templates table** - Stores all template data and stats
- **auth.users** (Supabase Auth) - Manages user authentication

No additional tables or migrations are required! ✨

---

## Performance Considerations

- **Admin Dashboard**: Loads all templates on first visit (consider pagination for 1000+ templates)
- **State Persistence**: Uses sessionStorage (cleared on browser close, limited to ~5-10MB per domain)
- **Session Management**: Handled by Supabase (automatic, no manual intervention needed)

---

## Support

If you encounter any issues:
1. Check the [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for detailed technical info
2. Review browser console for error messages
3. Check Supabase logs for authentication issues
4. Verify environment variables are loaded correctly

---

Happy managing! 🚀
