# Roadmap Update - tool_number Design Decision

**Insert this note into TOOL-MANAGEMENT-ROADMAP-v3.md at line 336**

---

## Current Text (Line 336):
```markdown
**WICHTIG:** `tool_number` wird zu `article_number` umbenannt, da T-Nummern (z.B. T113) separat über Tool Number Lists verwaltet werden (Phase 5).
```

## Replace With:
```markdown
**DESIGN DECISION (2025-11-16):** Die Umbenennung `tool_number` → `article_number` wurde von Phase 2 auf Phase 5 verschoben. 

**Aktueller Stand (Phase 2):**
- Feld heißt: `tool_number`
- Verwendung: Werkzeug-Identifikation
- Format: Beliebig (T001, GAR-123, WZ-2024-001, etc.)
- Status: ✅ Funktioniert einwandfrei

**Geplante Änderung (Phase 5):**
- Umbenennung: `tool_number` → `article_number`
- Grund: Trennung von Artikelnummern und maschinenbezogenen T-Nummern
- Zusammen mit: Tool Number Lists Implementation
- Details: Siehe DESIGN-DECISION-TOOL-NUMBER.md

**Entscheidung:** Phase 2 bleibt stabil mit `tool_number`. Die Umbenennung erfolgt gebündelt in Phase 5 mit der Tool Number Lists Implementierung für bessere Strukturierung und weniger Breaking Changes.
```

---

## Alternative (Shorter Version):
```markdown
**WICHTIG:** `tool_number` wird zu `article_number` umbenannt, da T-Nummern (z.B. T113) separat über Tool Number Lists verwaltet werden (Phase 5).

> **UPDATE 2025-11-16:** Diese Umbenennung wurde auf Phase 5 verschoben, um Phase 2 stabil zu halten. Details: DESIGN-DECISION-TOOL-NUMBER.md
```

---

## Instructions:

1. Open: `TOOL-MANAGEMENT-ROADMAP-v3.md`
2. Find: Line 336
3. Replace or add note
4. Save

This documents the decision for future reference and keeps the roadmap accurate.
