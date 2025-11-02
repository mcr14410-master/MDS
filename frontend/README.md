# MDS Frontend

React Frontend für das Fertigungsdaten Management System (MDS).

## Tech Stack

- **React 19** - UI Framework
- **Vite** - Build Tool & Dev Server
- **TailwindCSS** - Styling
- **Zustand** - State Management
- **React Router v7** - Routing
- **Axios** - HTTP Client

## Features

✅ **Phase 1, Woche 3 - COMPLETE:**
- Login/Logout UI
- JWT Authentication
- Protected Routes
- Dashboard mit Stats
- Bauteile-Übersicht (Tabelle)
- Permission-based UI
- Responsive Design

## Installation

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Build für Production
npm run build
```

## Development

### Server starten

```bash
npm run dev
```

Frontend läuft auf: **http://localhost:5173**  
Backend API: **http://localhost:5000**

### Test-Login

```
Username: admin
Passwort: admin123
```

## Projekt-Struktur

```
src/
├── components/         # Reusable Components
│   ├── Layout.jsx     # Navigation & Layout
│   └── ProtectedRoute.jsx
├── pages/             # Page Components
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   └── PartsPage.jsx
├── stores/            # Zustand Stores
│   ├── authStore.js   # Authentication
│   └── partsStore.js  # Parts Management
├── utils/             # Utilities
│   └── axios.js       # Axios Instance
├── config/            # Configuration
│   └── api.js         # API Endpoints
├── App.jsx           # Main App with Router
└── main.jsx          # Entry Point
```

## API Integration

### Axios Instance

Automatischer Token-Handling via Interceptors:

```javascript
import axios from './utils/axios';

// Token wird automatisch hinzugefügt
const response = await axios.get('/api/parts');
```

### Zustand Stores

**Auth Store:**
```javascript
import { useAuthStore } from './stores/authStore';

function MyComponent() {
  const { user, login, logout } = useAuthStore();
  
  const handleLogin = async () => {
    const result = await login({ login: 'admin', password: 'admin123' });
    if (result.success) {
      // Success
    }
  };
}
```

**Parts Store:**
```javascript
import { usePartsStore } from './stores/partsStore';

function MyComponent() {
  const { parts, fetchParts, createPart } = usePartsStore();
  
  useEffect(() => {
    fetchParts();
  }, []);
}
```

## Styling

TailwindCSS für alle Styles:

```jsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Click me
</button>
```

## Environment Variables

`.env` Datei:
```
VITE_API_URL=http://localhost:5000
```

## Routing

```javascript
// Public Route
<Route path="/login" element={<LoginPage />} />

// Protected Route
<Route 
  path="/parts" 
  element={
    <ProtectedRoute requiredPermission="part.read">
      <PartsPage />
    </ProtectedRoute>
  } 
/>
```

## Next Steps (Woche 4)

- [ ] Part Detail Page
- [ ] Part Create/Edit Forms
- [ ] Form Validation (React Hook Form)
- [ ] Better Error Handling
- [ ] Toast Notifications
- [ ] Loading Skeletons
- [ ] Mobile Responsive Tables

## Version

**v1.0.0** - Phase 1, Woche 3 Complete
