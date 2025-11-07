/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class', // Aktiviert Dark Mode mit CSS class
  theme: {
    extend: {
      // =====================================================
      // 🎨 FARB-KONFIGURATION - Manufacturing Data System
      // =====================================================
      // Alle verwendeten Farben in Light & Dark Mode
      // Auskommentierte Zeilen zeigen die Standard-Werte
      // Entferne "//" um eigene Farben zu definieren
      // =====================================================

      colors: {
        // ─────────────────────────────────────────────────
        // 🔵 PRIMARY COLOR (Buttons, Links, Aktionen)
        // ─────────────────────────────────────────────────
        // Verwendet in: Buttons, Links, Focus States
        // Standard: Tailwind Blue
        
        // blue: {
        //   400: '#60a5fa', // Helleres Blau (hover in dark mode)
        //   500: '#3b82f6', // Standard Blau
        //   600: '#2563eb', // Primary Button Color ⭐ HAUPTFARBE
        //   700: '#1d4ed8', // Hover State
        // },

        // ─────────────────────────────────────────────────
        // ⚫ GRAYS (Backgrounds, Text, Borders)
        // ─────────────────────────────────────────────────
        // Die wichtigsten Farben für Light/Dark Mode
        
        // gray: {
        //   // LIGHT MODE
        //   50: '#f9fafb',   // Body Background (light)
        //   100: '#f3f4f6',  // Section Background (light)
        //   200: '#e5e7eb',  // Border (light)
        //   300: '#d1d5db',  // Input Border (light)
        //   400: '#9ca3af',  // Placeholder Text
        //   500: '#6b7280',  // Hint Text
        //   600: '#4b5563',  // Secondary Text (light)
        //   
        //   // DARK MODE
        //   700: '#374151',  // Border (dark), Section BG (dark)
        //   800: '#1f2937',  // Card Background (dark) ⭐ WICHTIG
        //   900: '#111827',  // Body Background (dark) ⭐ WICHTIG
        // },

        // ─────────────────────────────────────────────────
        // 🔴 ERROR / DANGER (Fehler, Löschen, Warnung)
        // ─────────────────────────────────────────────────
        // Verwendet in: Error Messages, Delete Buttons
        
        // red: {
        //   50: '#fef2f2',   // Error Background (light)
        //   200: '#fecaca',  // Error Border (light)
        //   300: '#fca5a5',  // Error Text (dark mode)
        //   400: '#f87171',  // Error Text (dark mode alt)
        //   500: '#ef4444',  // Error Icon
        //   600: '#dc2626',  // Error Text (light)
        //   700: '#b91c1c',  // Delete Button
        //   800: '#991b1b',  // Error Border (dark)
        //   
        //   // Transparente Varianten für Dark Mode
        //   900: '#7f1d1d',  // Basis für /20 opacity
        // },

        // ─────────────────────────────────────────────────
        // 🟢 SUCCESS (Erfolgsmeldungen, Aktive Zustände)
        // ─────────────────────────────────────────────────
        // Verwendet in: Success Messages, Active Badges
        
        // green: {
        //   50: '#f0fdf4',   // Success Background (light)
        //   100: '#dcfce7',  // Success Badge (light)
        //   200: '#bbf7d0',  // Success Border (light)
        //   300: '#86efac',  // Success Text (dark)
        //   400: '#4ade80',  // Success Icon (dark)
        //   500: '#22c55e',  // Success Icon
        //   600: '#16a34a',  // Success Text (light), Active Border
        //   700: '#15803d',  // Success Hover
        //   800: '#166534',  // Success Border (dark)
        //   900: '#14532d',  // Basis für /20 opacity
        // },

        // ─────────────────────────────────────────────────
        // 🟡 WARNING (Warnungen, Änderungen)
        // ─────────────────────────────────────────────────
        // Verwendet in: Warning Messages, Changed States
        
        // yellow: {
        //   50: '#fffbeb',   // Warning Background (light)
        //   100: '#fef3c7',  // Warning Badge (light)
        //   300: '#fcd34d',  // Warning Text (dark)
        //   400: '#fbbf24',  // Warning Icon (dark)
        //   500: '#f59e0b',  // Warning Icon, Changed Border
        //   600: '#d97706',  // Warning Text (light)
        //   800: '#92400e',  // Warning Border (dark)
        //   900: '#78350f',  // Basis für /20 opacity
        // },

        // ─────────────────────────────────────────────────
        // 🟠 ORANGE (Rollback, Secondary Actions)
        // ─────────────────────────────────────────────────
        // Verwendet in: Rollback Buttons, Version Changes
        
        // orange: {
        //   100: '#ffedd5',  // Orange Badge (light)
        //   200: '#fed7aa',  // Orange Hover (light)
        //   300: '#fdba74',  // Orange Text (dark)
        //   700: '#c2410c',  // Orange Text (light)
        //   800: '#9a3412',  // Orange Border (dark)
        //   900: '#7c2d12',  // Basis für /30 opacity
        // },

        // ─────────────────────────────────────────────────
        // 🟣 PURPLE (Released State, Special)
        // ─────────────────────────────────────────────────
        // Verwendet in: Released Badge, Special States
        
        // purple: {
        //   100: '#f3e8ff',  // Purple Badge (light)
        //   300: '#d8b4fe',  // Purple Text (dark)
        //   800: '#6b21a8',  // Purple Text (light)
        //   900: '#581c87',  // Basis für /30 opacity
        // },

        // ─────────────────────────────────────────────────
        // 💡 SEMANTISCHE FARBEN (Optional - für Zukunft)
        // ─────────────────────────────────────────────────
        // Wenn du semantische Namen bevorzugst:
        
        // primary: {
        //   DEFAULT: '#2563eb',    // = blue-600
        //   hover: '#1d4ed8',      // = blue-700
        //   light: '#3b82f6',      // = blue-500
        //   dark: '#1e40af',       // = blue-800
        // },
        
        // background: {
        //   light: '#f9fafb',      // = gray-50
        //   'light-alt': '#ffffff', // = white
        //   dark: '#111827',       // = gray-900
        //   'dark-alt': '#1f2937', // = gray-800
        // },
        
        // text: {
        //   'primary-light': '#111827',  // = gray-900
        //   'primary-dark': '#f9fafb',   // = gray-50
        //   'secondary-light': '#4b5563', // = gray-600
        //   'secondary-dark': '#9ca3af',  // = gray-400
        // },
        
        // border: {
        //   light: '#e5e7eb',      // = gray-200
        //   dark: '#374151',       // = gray-700
        // },

        // success: '#22c55e',      // = green-500
        // warning: '#f59e0b',      // = yellow-500
        // error: '#ef4444',        // = red-500
        // info: '#3b82f6',         // = blue-500
      },

      // ─────────────────────────────────────────────────
      // 🎭 OPACITY VARIANTS (für bg-green-900/20 etc.)
      // ─────────────────────────────────────────────────
      // Tailwind unterstützt automatisch /20, /30 etc.
      // Keine zusätzliche Konfiguration nötig!
      
      // ─────────────────────────────────────────────────
      // 📐 SPACING & SIZES (wenn nötig)
      // ─────────────────────────────────────────────────
      // spacing: {
      //   '128': '32rem',
      //   '144': '36rem',
      // },
      
      // ─────────────────────────────────────────────────
      // 🔤 FONTS (wenn nötig)
      // ─────────────────────────────────────────────────
      // fontFamily: {
      //   sans: ['Inter', 'system-ui', 'sans-serif'],
      //   mono: ['Fira Code', 'monospace'],
      // },
    },
  },
  plugins: [],
}

// =====================================================
// 📖 QUICK REFERENCE - Wo werden welche Farben genutzt?
// =====================================================
//
// BACKGROUNDS:
// - Body Light: gray-50
// - Body Dark: gray-900
// - Card Light: white (bg-white)
// - Card Dark: gray-800
// - Section Light: gray-50
// - Section Dark: gray-700
//
// TEXT:
// - Primary Light: gray-900
// - Primary Dark: white
// - Secondary Light: gray-600
// - Secondary Dark: gray-400
// - Hint: gray-500 (both modes)
//
// BORDERS:
// - Light: gray-200
// - Dark: gray-700
// - Input Light: gray-300
// - Input Dark: gray-600
//
// BUTTONS:
// - Primary: blue-600
// - Primary Hover: blue-700
// - Success: green-600
// - Error: red-600
// - Warning: yellow-600
//
// BADGES:
// - Success: green-100/green-800 (light/dark)
// - Error: red-100/red-800
// - Warning: yellow-100/yellow-800
// - Info: blue-100/blue-800
//
// STATES:
// - Active: green-500
// - Changed: yellow-500
// - Removed: red-500
// - Added: green-500
//
// =====================================================
