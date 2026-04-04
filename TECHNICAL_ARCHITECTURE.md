# Technical Architecture & Implementation Details

## Overview
This document provides an in-depth technical explanation of the three main features implemented for Dummmy.

---

## 1. Admin Dashboard Architecture

### Components
- **File:** `src/pages/AdminDashboard.tsx`
- **Exports:** `AdminDashboard` component

### State Management
```typescript
// Admin data states
const [templates, setTemplates] = useState<AdminTemplate[]>([])
const [users, setUsers] = useState<AdminUser[]>([])
const [stats, setStats] = useState<SiteStats>({...})
const [tab, setTab] = useState<'overview' | 'users' | 'templates'>('overview')
const [searchQuery, setSearchQuery] = useState('')
```

### Data Flow

```
┌─────────────────────┐
│   Admin Dashboard   │
└──────────┬──────────┘
           │
           ├─ Load Templates (via Supabase)
           │  └─ GET from public.templates table
           │
           ├─ Load Users (unique user_ids from templates)
           │  └─ Aggregate user data from templates
           │
           └─ Calculate Statistics
              └─ Sum views, downloads, shares
```

### Database Queries
**Get All Templates:**
```sql
SELECT id, slug, name, user_id, views, downloads, shares, is_private, created_at, updated_at
FROM public.templates
ORDER BY created_at DESC
```

**Delete Template:**
```sql
DELETE FROM public.templates WHERE id = {templateId}
```

### Security Implementation
- Admin check: `user?.email === import.meta.env.VITE_ADMIN_EMAIL`
- Redirect non-admins to home page
- Template deletion requires confirmation
- Loading spinner during async operations

### UI Patterns
- **Tabs:** Overview → Users → Templates
- **Cards:** Grid layout for stats, list layout for templates
- **Search:** Client-side filtering with `searchQuery`
- **Animations:** Framer Motion for smooth transitions

---

## 2. Template Generator State Persistence

### Architecture Overview

```
┌──────────────────────────────────────┐
│      Template Generator Page         │
│          (/dp/:slug)                 │
└──────────────┬───────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    v                     v
┌─────────────┐    ┌──────────────┐
│ useAuth()   │    │sessionStorage │
│             │    │              │
│ user state  │    │userImages    │
└─────────────┘    └──────────────┘
```

### Components Involved

#### 1. `useGeneratorState.ts` (New Hook)
**Purpose:** Manage generator page navigation state

**Functions:**
```typescript
function getSavedGeneratorPath(): string | null
// Returns saved /dp/:slug path or null if expired (>30 min)

function clearSavedGeneratorPath(): void
// Clears saved path from sessionStorage
```

**Time-Based Cleanup:**
- Saves timestamp when path is stored
- Ignores paths older than 30 minutes
- Prevents stale redirects after long workflows

#### 2. Generator.tsx Modifications
**State Persistence Logic:**

```typescript
// On Component Mount
useEffect(() => {
  const savedUserImages = sessionStorage.getItem(`generator_images_${slug}`);
  if (savedUserImages) {
    setUserImages(JSON.parse(savedUserImages));
  }
}, [slug]);

// On State Change - Save to SessionStorage
useEffect(() => {
  if (Object.keys(userImages).length > 0) {
    sessionStorage.setItem(
      `generator_images_${slug}`,
      JSON.stringify(userImages)
    );
  }
}, [userImages, slug]);
```

**Key Points:**
- Storage key: `generator_images_{slug}` - Makes it template-specific
- Saves on every image change (debounced by React batching)
- Restores on component mount
- Only saves if images exist (avoids empty data)

#### 3. AuthModal.tsx Enhancement
**New Props:**
```typescript
interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  message?: string;
  onAuthSuccess?: () => void;  // NEW
}
```

**Usage in Generator:**
```typescript
<AuthModal
  open={showAuthModal}
  onClose={() => setShowAuthModal(false)}
  onAuthSuccess={() => {
    if (pendingDownloadRef.current) {
      pendingDownloadRef.current = false;
      setTimeout(() => performDownload(), 300);
    }
  }}
  message="Sign in to download your design"
/>
```

### Data Flow: Typical User Session

1. **User Arrives at Template**
   ```
   /dp/my-template
   └─ useEffect checks sessionStorage
      └─ Restore userImages if found
   ```

2. **User Uploads Images**
   ```
   handleImageUpload()
   └─ setUserImages() 
      └─ useEffect saves to sessionStorage
   ```

3. **User Clicks Download Without Auth**
   ```
   handleDownload()
   └─ if (!user) {
       pendingDownloadRef.current = true;
       setShowAuthModal(true);
     }
   ```

4. **User Authenticates**
   ```
   AuthModal.handleSubmit()
   └─ signInWithEmail() or signInWithGoogle()
      └─ onAuthSuccess callback triggered
         └─ performDownload() executes
   ```

5. **Download Completes**
   ```
   performDownload()
   └─ Generate canvas image
      └─ Create download link
      └─ Start file download
      └─ sessionStorage can be cleared (optional)
   ```

### SessionStorage Implementation Details

**Storage Structure:**
```javascript
// Per-template storage
sessionStorage.getItem('generator_images_template-slug')
// Returns: {"element-id-1": "data:image/png;base64,...", ...}

// Storage limit: ~5-10MB per domain
// Automatically cleared when browser session ends
```

**Why SessionStorage?**
- ✅ Persists during page navigation/redirects
- ✅ Cleared on browser close (privacy)
- ✅ Sufficient for image data (blobs as base64)
- ✅ No server storage needed
- ✅ Instant access (no network latency)

---

## 3. Session Persistence Architecture

### Authentication Flow Diagram

```
┌─────────────────────────────────────────────────┐
│              App Component                       │
│         (wraps entire application)               │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────v──────────┐
          │   AuthProvider      │
          │  (useAuth context)  │
          └──────────┬──────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         v           v           v
      Auth    Supabase    Listen for
      State   Session      Changes
      (Local) (Secure)     (Global)
```

### useAuth Hook Implementation

**Key Functions:**
```typescript
const AuthProvider: React.FC<{ children }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for auth changes globally
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{...}}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Session Persistence Mechanism

**1. Initial Load:**
```
App Mounts
└─ AuthProvider mounts
   └─ supabase.auth.getSession() called
      └─ Supabase retrieves session from localStorage
         └─ Browser has stored session data from previous login
            └─ setSession() and setUser() with existing session
```

**2. During Navigation:**
```
User navigates: /dashboard → /dp/template → /explore
└─ Each page uses useAuth() hook
   └─ Context provides existing session + user
      └─ No new login required
```

**3. New Sign-In:**
```
User signs in (email or Google)
└─ supabase.auth.signInWithPassword() or signInWithOAuth()
   └─ Server returns session + tokens
      └─ Supabase stores in localStorage
         └─ onAuthStateChange fires
            └─ setSession() and setUser() updated
               └─ All components using useAuth get new data
```

**4. Sign-Out:**
```
User clicks Sign Out
└─ supabase.auth.signOut()
   └─ Clears localStorage session
      └─ onAuthStateChange fires with null session
         └─ setSession(null) and setUser(null)
            └─ All pages redirect or hide auth content
```

### Browser Storage (Supabase Handles)

**localStorage:**
```javascript
// Supabase automatically stores:
localStorage.getItem('@supabase.auth.token')
localStorage.getItem('@supabase.auth.refresh_token')
localStorage.getItem('@supabase.auth.expires_at')
```

**Security Features:**
- Tokens automatically refreshed when expired
- Secure token storage in browser
- HTTPS only (in production)
- HttpOnly cookies option (backend)

---

## Integration Points

### File Structure
```
src/
├── hooks/
│   ├── useAuth.tsx                  ← Session management
│   ├── useGeneratorState.ts         ← NEW: State persistence
│   └── useTheme.tsx
├── components/
│   ├── AuthModal.tsx                ← Enhanced with onAuthSuccess
│   └── generator/
│       └── Generator.tsx            ← State persistence logic
├── pages/
│   ├── AdminDashboard.tsx           ← NEW: Admin interface
│   ├── HomePage.tsx                 ← Admin link added
│   └── [...other pages]
└── App.tsx                          ← Admin route added
```

### Data Flow Summary

```
┌─────────────────────────────────────┐
│    User Logs In at /dp/template     │
└────────────┬────────────────────────┘
             │
    ┌────────v────────┐
    │  useAuth Hook   │
    │ (Global state)  │
    └────────┬────────┘
             │
    ┌────────v────────┐
    │ AuthModal Closes│
    │ onAuthSuccess() │
    │ is triggered    │
    └────────┬────────┘
             │
    ┌────────v─────────────────┐
    │ performDownload() runs    │
    │ (state still in memory)   │
    └────────┬─────────────────┘
             │
    ┌────────v────────────────────┐
    │ User navigates to /dashboard│
    │ (session persists via token)│
    │ (useAuth() still works)     │
    └────────────────────────────┘
```

---

## Performance Considerations

### AdminDashboard
- **Current:** Loads all templates on mount
- **Scale Issue:** 1000+ templates could be slow
- **Solution:** Implement pagination or virtual scrolling

### Generator State Persistence
- **Storage:** sessionStorage (~5-10MB limit)
- **Performance:** Instant access, no network calls
- **Cleanup:** Automatic on browser close

### Session Management
- **Token Refresh:** Automatic via Supabase
- **API Calls:** Minimal overhead
- **Network:** Only one initial check per session

---

## Testing Scenarios

### Test 1: State Persistence
```
1. Goto /dp/template-slug
2. Upload image to placeholder A
3. Verify sessionStorage has data
4. Refresh page
5. Verify image is restored
6. Make another change
7. Verify sessionStorage updated
```

### Test 2: Auth Redirect Flow
```
1. Goto /dp/template-slug
2. Upload image and click download
3. Sign in from modal
4. Verify page doesn't change
5. Verify image is still there
6. Download succeeds
```

### Test 3: Session Persistence
```
1. Sign in at /dp/template-slug
2. Go to /dashboard
3. Verify still logged in
4. Go to /explore
5. Verify still logged in
6. Go to /create
7. Verify still logged in
```

### Test 4: Admin Access
```
1. Set VITE_ADMIN_EMAIL in .env
2. Sign in with that email
3. Go to /admin
4. Dashboard loads
5. Try to delete a template
6. Verify deletion works
```

---

## Error Handling

### Try/Catch Blocks
- Admin data loading wrapped in try/catch
- Deletion operations have confirmation + error handling
- JSON parsing of sessionStorage has error fallback

### User Feedback
- Toast notifications for errors
- Loading spinners during operations
- Redirect for unauthorized access

### Browser Compatibility
- Uses standard localStorage/sessionStorage APIs
- Works on all modern browsers
- Fallback graceful degradation

---

## Future Optimization Opportunities

1. **State Persistence:**
   - Add IndexedDB for larger data
   - Implement auto-save indicator
   - Add recovery/undo functionality

2. **Admin Dashboard:**
   - Add pagination for large datasets
   - Implement real-time updates with Supabase subscriptions
   - Add batch operations

3. **Session Management:**
   - Implement session timeout warning
   - Add device management
   - Add session activity logging

---

## Debugging Tips

### Check Session State
```javascript
// In DevTools console
const authContext = document.querySelector('[data-auth]');
// Or manually inspect localStorage
localStorage.getItem('@supabase.auth.token')
```

### Check State Persistence
```javascript
// In DevTools console
sessionStorage.getItem('generator_images_template-slug')
```

### Monitor Auth Changes
```typescript
// Add to any component
useEffect(() => {
  console.log('Current user:', user);
  console.log('Session:', session);
}, [user, session]);
```

---

This implementation provides a robust, scalable foundation for authentication and state management in your Dummmy application. 🎉
