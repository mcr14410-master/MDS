# Woche 4 - Integration & Testing - Installation

## 📦 Neue/Geänderte Dateien

Diese Dateien wurden in dieser Session erstellt/geändert:

### Backend
- `backend/src/server.js` - CORS aktiviert für Frontend

### Frontend
- `frontend/src/components/Toaster.jsx` - Toast Notification System (NEU)
- `frontend/src/pages/PartDetailPage.jsx` - Part Detail View (NEU)
- `frontend/src/pages/PartFormPage.jsx` - Part Create/Edit Form (NEU)
- `frontend/src/pages/PartsPage.jsx` - Aktualisiert mit Toast & Icons
- `frontend/src/App.jsx` - Aktualisiert mit neuen Routes

---

## 🚀 Installation

### Schritt 1: Backend aktualisieren

```bash
cd backend
cp /pfad/zu/server.js src/server.js
```

### Schritt 2: Frontend aktualisieren

```bash
cd frontend

# Neue Dateien kopieren
cp /pfad/zu/Toaster.jsx src/components/
cp /pfad/zu/PartDetailPage.jsx src/pages/
cp /pfad/zu/PartFormPage.jsx src/pages/

# Aktualisierte Dateien überschreiben
cp /pfad/zu/PartsPage.jsx src/pages/
cp /pfad/zu/App.jsx src/
```

### Schritt 3: Server starten

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## ✅ Testing Checklist

### 1. Login testen
- [ ] Öffne http://localhost:5173
- [ ] Login mit: `admin` / `admin123`
- [ ] Dashboard sollte erscheinen

### 2. Parts List testen
- [ ] Navigiere zu "Bauteile"
- [ ] Liste sollte laden (oder leer sein)
- [ ] Filter/Search testen

### 3. Part Create testen
- [ ] Klicke "Neues Bauteil"
- [ ] Fülle Formular aus:
  - Bauteilnummer: `TEST-001`
  - Bezeichnung: `Test Bauteil`
  - Status: `draft`
- [ ] Klicke "Erstellen"
- [ ] Toast Notification sollte erscheinen
- [ ] Redirect zu Part Detail Page

### 4. Part Detail testen
- [ ] Part Details sollten angezeigt werden
- [ ] "Bearbeiten" Button sollte vorhanden sein
- [ ] "Löschen" Button sollte vorhanden sein

### 5. Part Edit testen
- [ ] Klicke "Bearbeiten"
- [ ] Ändere Bezeichnung zu `Test Bauteil (Geändert)`
- [ ] Klicke "Speichern"
- [ ] Toast Notification sollte erscheinen
- [ ] Änderungen sollten sichtbar sein

### 6. Part Delete testen
- [ ] Gehe zu Part Detail
- [ ] Klicke "Löschen"
- [ ] Bestätige Dialog
- [ ] Toast Notification sollte erscheinen
- [ ] Redirect zu Parts List
- [ ] Part sollte nicht mehr in Liste sein

### 7. Toast Notifications testen
- [ ] Success Toast (grün) nach Create/Update/Delete
- [ ] Error Toast (rot) bei Fehlern
- [ ] Toast verschwindet automatisch nach 3-4 Sekunden
- [ ] Toast kann manuell geschlossen werden (X Button)

### 8. Permissions testen
- [ ] Als Admin: Alle Buttons sichtbar
- [ ] Als User ohne Permissions: Buttons versteckt

---

## 🐛 Bekannte Einschränkungen

### Customer Dropdown fehlt noch
- Aktuell: `customer_id` als Textfeld
- Kommt später: Dropdown mit echten Kunden

### File Upload fehlt noch
- Aktuell: `cad_file_path` als Textfeld
- Kommt in Woche 6: Echter File Upload

### Operations/Programs fehlen noch
- Quick Actions auf Detail Page sind disabled
- Kommen in Woche 5+

---

## 📝 Was wurde erreicht?

✅ **CORS aktiviert** - Frontend ↔ Backend verbunden
✅ **Part Detail Page** - Vollständige Ansicht eines Bauteils
✅ **Part Create/Edit Forms** - Formulare mit Validierung
✅ **Toast Notifications** - Professionelles User Feedback
✅ **Bessere UX** - Icons, Loading States, Empty States
✅ **Permission-based UI** - Buttons nur für berechtigte User

---

## 🎯 Nächste Schritte (Woche 5)

1. **Operations CRUD** - Arbeitsgänge zu Bauteilen
2. **OP-Nummern** - OP10, OP20, OP30, ...
3. **Maschinen-Zuweisung** - Welche Maschine für welchen OP
4. **Sequence Management** - Reihenfolge der Arbeitsgänge

---

## 💡 Tipps für lokales Testing

### PostgreSQL läuft nicht?
```bash
# Check Status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Restart wenn nötig
sudo systemctl restart postgresql
```

### Port bereits belegt?
```bash
# Backend Port 5000 prüfen
lsof -i :5000

# Frontend Port 5173 prüfen
lsof -i :5173
```

### Datenbank zurücksetzen?
```bash
cd backend
npm run migrate:down
npm run migrate:up
npm run seed
```

---

## 📸 Screenshots erwünscht

Wenn du testest, mach gerne Screenshots von:
- ✅ Parts List mit Daten
- ✅ Part Detail Page
- ✅ Create/Edit Forms
- ✅ Toast Notifications

So können wir sehen, ob alles funktioniert! 😊

---

## 🎊 Phase 1, Woche 4 - 50% Complete!

**Was noch fehlt diese Woche:**
- E2E Testing Setup (optional)
- Performance-Optimierung
- Code-Cleanup
- Dokumentation vervollständigen

**Geschätzte verbleibende Zeit:** 3-4 Stunden

---

**Viel Erfolg beim Testen!** 🚀
