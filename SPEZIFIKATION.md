# Spezifikation: Essensplaner & Smart Shopping PWA

## Teil 1: Fachliche Spezifikation (Functional Specification)

### 1. Systemvision & Kernziele
Eine hochmoderne, responsive Webanwendung (PWA) zur kollaborativen Essensplanung und Einkaufsverwaltung für Familien und Haushalte mit integriertem Social-Sharing für Freunde.
* **Kernnutzen:** Vollautomatische Wochenplanung per intelligentem Zufallsalgorithmus (7-Tage-Cooldown, Slot-Eignung), automatische Einkaufslistengenerierung mit Vorratsabgleich („Never Out of Stock“), latenzfreie Echtzeit-Kollaboration im Supermarkt und multimodaler Rezept-Import (URL-Scraping, Sprach-Diktat, Food-Photos).

### 2. Benutzer- & Mandantenmodell (Multi-Tenancy)
1. **User (Individuum):** Identifiziert via Firebase Auth.
2. **Haushalt (Tenant - Vollzugriff):** 
   * Primäre Verwaltungseinheit für Wochenpläne, Einkaufslisten und Vorratskammern.
   * Rollen: `Owner` (Verwalter) und `Member` (z. B. Partner/in).
   * Alle Haushaltsmitglieder arbeiten synchron auf denselben Daten mit vollen Lese- und Schreibrechten.
3. **Freunde (Social Graph - Read-Only):**
   * Verknüpfung zwischen zwei Haushalten/Usern via Einladungslink oder 6-stelligem Code.
   * Freunde können freigegebene Wochenpläne („Was kocht Familie Meyer diese Woche?“) und öffentliche/geteilte Rezepte rein lesend einsehen und in den eigenen Katalog duplizieren.
   * **Strikte Datentrennung:** Freunde haben **keinen** Zugriff auf Einkaufslisten, Vorräte oder private Haushaltsnotizen.

### 3. Detaillierte Funktionsbeschreibungen & User Flows

#### 3.1 Wochenplanung & Heuristischer Zufalls-Algorithmus
* **Slot-Matrix:** 7 Tage (Montag bis Sonntag) mit flexibel aktivierbaren Slots (`Mittagessen` und/oder `Abendessen`).
* **Intelligente Zufallslogik:**
  * **Cooldown:** Rezepte, die in den letzten **7 Tagen** gekocht wurden, sind temporär gesperrt.
  * **Slot-Eignung:** Rezepte sind markiert (`isLunch`, `isDinner`, `prepTimeMinutes`). Unter der Woche mittags werden z. B. nur schnelle Gerichte (<= 30 Min.) vorgeschlagen.
  * **Diversitäts-Schutz:** Keine zwei Tage hintereinander mit derselben Hauptkategorie (z. B. nicht 2x Pasta in Folge).
* **Interaktives Locking & Re-Roll:**
  * Jeder Slot bietet ein **Schloss-Icon (Pin)** zum Fixieren, ein **Würfel-Icon (Single-Shuffle)** zum Neuauswürfeln und einen Button zur **manuellen Rezeptauswahl**.
  * Globaler Button: *„Nur ungesperrte Tage neu auswürfeln“*.

#### 3.2 Einkaufsliste & Supermarkt-Echtzeitsynchronisation
* **Dual-Source-Architektur:**
  * `source: "plan"` (automatisch aus Rezepten generiert; an `recipeId` gekoppelt).
  * `source: "manual"` (manuell hinzugefügt, z. B. Milch, Kaffee).
* **Vorratsabgleich & „Never Out of Stock“ (Pantry):**
  * Zutaten mit dem Flag `isStaple: true` (Salz, Pfeffer, Zucker, Speiseöl etc.) werden standardmäßig **nicht** auf die Einkaufsliste gesetzt.
  * Vor der endgültigen Generierung erscheint ein kurzer Review-Dialog: *„Folgende Zutaten werden benötigt. Hast du davon schon etwas da?“*
* **Echtzeit-Kollaboration im Supermarkt:**
  * Nutzer hakt im Laden Artikel ab -> Status wechselt sofort auf `checked: true` und wird durchgestrichen.
  * Partner/in fügt zu Hause einen Artikel hinzu -> der Artikel erscheint sofort ohne Seiten-Reload in der Ansicht im Supermarkt.
  * Sortierung der Einkaufsliste nach Supermarkt-Kategorien (Obst & Gemüse, Kühlung, Trockenwaren, Drogerie etc.) für minimale Laufwege im Markt.

#### 3.3 Rezeptverwaltung, Multimodale Ingestion & Fotodokumentation
* **URL-Import (Smart Scraper):**
  * Eingabe einer Rezept-URL -> Cloud Run Service extrahiert Metadaten (primär Schema.org/Recipe JSON-LD, Fallback via LLM).
  * Automatische Zerlegung in Titel, Portionen, Zubereitungszeit, Zutaten (Menge, Einheit, Name) und nummerierte Zubereitungsschritte.
* **Sprach-Diktat (Voice-to-Recipe):**
  * Spracheingabe über Web Speech API im Browser -> Text wird via Cloud Run LLM in ein valides Rezept-Schema transformiert.
* **Food-Fotografie („Gekocht!“):**
  * Nach der Zubereitung kann der Nutzer direkt über die PWA ein Foto des fertigen Essens aufnehmen.
  * Client-seitige Komprimierung (WebP, max. 1200px) und direkter Upload zu Firebase Storage.
* **Ernährungswissen („Was bewirkt die Zutat im Körper?“):**
  * Zu jeder Zutat gibt es eine informative, visuell ansprechende Detailansicht mit physiologischen Wirkungen.
  * Aggressiv gecacht in einer globalen Wissensdatenbank; versehen mit einem rechtlichen Standard-Disclaimer (kein medizinischer Ratschlag).

#### 3.4 Social Sharing („Was kocht Familie Meyer?“)
* Haushaltsübergreifende Freundschaftsanfragen via Link/Code.
* Freundschafts-Feed: Anzeige der Wochenpläne von befreundeten Haushalten.
* Fork-Feature: Mit einem Klick kann ein Rezept aus dem Katalog eines Freundes in den eigenen Haushaltsbestand kopiert werden.

### 4. Screen-Architektur (PWA-Optimiert)
1. **Dashboard (Home):** Heutige Mahlzeiten, Schnellzugriff Einkaufsliste, Ernährungstipp des Tages.
2. **Wochenplaner:** 7-Tage-Grid (Mo-So), Slots für Mittag/Abend, Pin/Lock-Icons, Shuffle-Buttons, Button „Einkaufsliste generieren“.
3. **Live-Einkaufsliste:** Echtzeitliste sortiert nach Warengruppen, Checkboxen, Schnelleingabe-Feld für manuelle Artikel, Offline-Indikator.
4. **Rezeptkatalog & Details:** Suche, Filter nach Tags (Quick, Veggie, Dinner), Detailansicht mit Portionsrechner und Foto-Upload.
5. **Smart Ingestion Modal:** Tabs: „URL importieren“, „Einsprechen (Diktat)“, „Manuell“. Vorschau und Korrektur vor dem Speichern.
6. **Vorratskammer (Pantry):** Liste aller „Never Out of Stock“-Basics mit Toggle-Status (`Vorhanden` vs. `Aufbraucht`).
7. **Zutaten-Wissen & Ernährung:** Detailansicht physiologischer Wirkungen mit Standard-Disclaimer.
8. **Freunde & Community:** Wochenpläne befreundeter Familien einsehen, Rezepte stöbern & forken.
9. **Haushalts-Einstellungen:** Partner/in per QR-Code oder Invite-Link einladen, Rollenvergabe.

---

## Teil 2: Technische Spezifikation (Technical Specification)

### 1. System- & Deployment-Architektur
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Vite PWA Plugin (Workbox Offline-Cache).
* **Backend for Frontend (BFF):** Node.js (Fastify/Express), TypeScript, zustandslos auf Google Cloud Run.
* **Database & Auth:** Google Cloud Firestore (Echtzeit-Listener `onSnapshot` + Offline-Cache IndexedDB) & Firebase Auth.
* **Storage:** Firebase Cloud Storage (Food-Photos WebP bis 2 MB).
* **Single-Container Deployment:** Node.js serviert `/api/*` und die statischen React-Assets auf Port 8080.

### 2. Firestore Datenmodell (Kollektionen & Schemas)
* `households/{householdId}`:
  * `id`: string
  * `name`: string
  * `members`: `{ [uid]: { role: "owner" | "member", displayName: string } }`
  * `pantryStaples`: string[] (z. B. `["salt", "sugar", "pepper"]`)
  * `friendHouseholdIds`: string[]
* `households/{householdId}/recipes/{recipeId}`:
  * `id`: string
  * `title`: string
  * `sourceUrl`?: string
  * `prepTimeMinutes`: number
  * `cookTimeMinutes`: number
  * `servings`: number
  * `isLunch`: boolean
  * `isDinner`: boolean
  * `categories`: string[]
  * `visibility`: "private" | "friends" | "public"
  * `lastCookedAt`?: string
  * `photoUrl`?: string
  * `ingredients`: `Array<{ canonicalId: string, displayName: string, amount: number, unit: string, category: string, isStaple: boolean }>`
  * `instructions`: string[]
* `households/{householdId}/meal_plans/{weekId}`:
  * `weekId`: string (z. B. `2026-W40`)
  * `days`: `{ [day: string]: { lunch: { recipeId: string, title: string, isLocked: boolean } | null, dinner: { recipeId: string, title: string, isLocked: boolean } | null } }`
  * `updatedAt`: string
* `households/{householdId}/shopping_list/{itemId}`:
  * `id`: string
  * `canonicalId`: string
  * `name`: string
  * `amount`: number
  * `unit`: string
  * `category`: string
  * `checked`: boolean
  * `source`: "plan" | "manual"
  * `linkedRecipeId`?: string
  * `addedBy`: string
  * `createdAt`: string
  * `updatedAt`: string
* `ingredients_knowledge/{canonicalId}` (Globaler Cache):
  * `canonicalId`: string
  * `name`: string
  * `healthBenefits`: string
  * `vitaminsAndMinerals`: string[]
  * `nutritionalHighlights`: string
  * `imageUrl`: string
  * `disclaimer`: string

### 3. Node.js Cloud Run BFF API
* `POST /api/recipes/scrape`: Body `{ url }` -> Schema.org JSON-LD Extraction; Fallback: Textbereinigung + Gemini 1.5 Flash Structured JSON Output.
* `POST /api/recipes/parse-dictation`: Body `{ rawText }` -> Gemini 1.5 Flash structured parsing in Zutaten und Schritte.
* `GET /api/nutrition/:canonicalIngredientId`: Firestore Cache-Prüfung -> bei Miss LLM-Generierung, Cache-Schreiben und Rückgabe.

### 4. Sicherheit & Resilienz
* **Security Rules:** Haushalts-Isolation (voller Zugriff nur für Haushaltsmitglieder). Freunde haben selektiven Read-Only-Zugriff auf Rezepte/Wochenpläne (`visibility == 'friends'`), aber **niemals** auf Einkaufsliste oder Vorräte.
* **Offline-Resilienz:** Firestore `enableIndexedDbPersistence`. Optimistic UI beim Abhaken im Supermarkt.
* **CI/CD:** Multi-Stage Dockerfile auf Port 8080. GitHub Actions Workflow deployt über Google Workload Identity Federation auf Cloud Run.
