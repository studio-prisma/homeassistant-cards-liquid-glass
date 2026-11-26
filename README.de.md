# Liquid Glass Cards

Dashboard-Karten für Home Assistant in einem ruhigen Glas-Stil: ein Kopf mit Uhr, eine Liste „Jetzt dran“, Bereichs-Kacheln, die einen ganzen Raum schalten, Zeilen für Abfahrten oder Systemwerte, eine Kennzahl mit Verlaufskurve und eine Navigationsleiste.

English version: [README.md](README.md)

Eine Datei, kein Build auf deiner Seite, zur Laufzeit keine fremden Bibliotheken. Die Karten laufen mit jedem Theme und übernehmen die Glas-Farben aus Theme-Variablen, wenn ein Theme sie liefert.

## Karten

| Karte | Zweck |
|---|---|
| `custom:lg-hero` | Uhr, Datum, aktuelles Wetter, Status-Chips |
| `custom:lg-headline` | Begrüßung nach Tageszeit oder ein Lage-Satz („Alles ruhig. Eine Sache ist offen.“) |
| `custom:lg-now` | Zeilen, die nur erscheinen, wenn eine Regel zutrifft, je mit einem Aktionsknopf |
| `custom:lg-rooms` | Raster aus Bereichs-Kacheln. Tippen schaltet alle Lichter des Bereichs, Halten öffnet den Bereich |
| `custom:lg-room` | Eine einzelne Kachel für einen Bereich oder eine Entität |
| `custom:lg-list` | Glas-Karte mit Zeilen: aus einem Entitätszustand zerlegt oder eine Zeile je Entität |
| `custom:lg-stat` | Eine Zahl mit Verlaufskurve |
| `custom:lg-nav` | Leiste unten am Handy, Reihe aus Pillen auf breiten Bildschirmen |
| `custom:lg-agenda` | Anstehende Termine, nach Tagen gruppiert (heute, morgen, …) |
| `custom:lg-energy` | Energie heute, diese Woche und diesen Monat, jeweils gegen den Vorzeitraum bis zum gleichen Stand; Kurve heute über gestern; größter Verbraucher |
| `custom:lg-parcels` | Sendungen aus der Parcel-Integration: ein Satz zur Lage, Fortschritt in vier Schritten pro Sendung, Verlauf per Tippen, Hinzufügen direkt in der Karte |
| `custom:lg-idle` | Keine sichtbare Karte: öffnet nach Inaktivität eine ruhige Ansicht, Tippen führt zurück, dimmt nachts |
| `custom:lg-column` | Hohes Glas-Panel mit anderen Karten; auf breiten Bildschirmen reicht es bis zum unteren Fensterrand und dockt die letzten Karten unten an |

## Voraussetzungen

- Home Assistant 2025.1 oder neuer. Entwickelt und getestet mit 2026.10 und 2026.11.
- Empfohlen ist eine Sections-Ansicht. Die Karten laufen auch in anderen Ansichtstypen.
- Für die Raum-Kacheln müssen Bereiche (und wahlweise Etagen) in Home Assistant eingerichtet sein.

## Installation

**HACS / Marketplace (benutzerdefiniertes Repository)**

1. `https://github.com/studio-prisma/homeassistant-cards-liquid-glass` als benutzerdefiniertes Repository vom Typ *Dashboard* hinzufügen.
2. *Liquid Glass Cards* installieren. Die Ressource wird dabei eingetragen.
3. Browser neu laden.

**Von Hand**

1. `liquid-glass-cards.js` aus dem neuesten Release herunterladen.
2. Nach `config/www/liquid-glass-cards/` kopieren.
3. Unter *Einstellungen → Dashboards → Ressourcen* die Ressource `/local/liquid-glass-cards/liquid-glass-cards.js?v=<version>` mit dem Typ *JavaScript-Modul* anlegen.
4. Browser neu laden. Nach einem Update den Wert hinter `?v=` ändern, sonst behalten Browser die alte Datei bis zu 31 Tage.

Prüfung: In der Kartenauswahl nach „Liquid Glass“ suchen. Erscheint nichts, wurde die Ressource nicht geladen. Die Browser-Konsole meldet `LIQUID-GLASS-CARDS <version>`, sobald die Datei läuft.

## Konfiguration

Jede Karte hat im Dashboard-Editor ein vollständiges Formular. Es zeigt die Werte, die tatsächlich gelten, auch die Standardwerte, und schreibt keinen Wert in die Konfiguration, der dem Standard entspricht. Listen (Chips, Zeilen, Bereiche, Navigationseinträge) werden als Listen bearbeitet: hinzufügen, umsortieren, löschen; Regeln und Zeitfenster sind Felder des jeweiligen Eintrags. Die Listen-Editoren nutzen den Objekt-Selektor neuerer Home-Assistant-Versionen; wo er fehlt, bearbeitest du Listen im Code-Editor. Schlüssel, die das Formular nicht kennt, bleiben unangetastet, zum Beispiel `data` und `target` eines Knopfs.

### Gemeinsame Optionen

| Option | Karten | Bedeutung |
|---|---|---|
| `size: large` | alle | Größere Schrift, Kacheln und Knöpfe für Wand-Displays |
| `when` | Chips, Zeilen | Nur anzeigen, wenn die Entität passt: `state`, `state_not` (ein Wert oder eine Liste), `above`, `below` |
| `after`, `before`, `weekdays` | Chips, Zeilen | Nur in einem Zeitfenster anzeigen. `HH:MM`, auch über Mitternacht. Wochentage als `mon` … `sun` |
| `{state}`, `{name}` | Beschriftungen, Titel, Untertitel | Werden durch den formatierten Zustand und den Entitätsnamen ersetzt |

Zeitfenster richten sich nach der Uhr des Geräts, das das Dashboard anzeigt.

### lg-hero

```yaml
type: custom:lg-hero
size: large
weather: weather.home
chips:
  - entity: alarm_control_panel.home
    label: "Alarm {state}"
  - entity: binary_sensor.waste_collection_tomorrow
    label: Müll morgen
    color: amber            # amber, orange, green, blue, red; Standard ist neutral
    when: { state: "on" }
  - entity: sensor.next_departure
    label: "Bahn {state}"
    color: blue
    after: "05:30"
    before: "10:00"
    weekdays: [mon, tue, wed, thu, fri]
```

Ein Chip öffnet die Details der Entität. Mit `tap` lässt sich das ändern, mit denselben Schlüsseln wie bei `button` in `lg-now`. `show_date: false` blendet das Datum aus.

### lg-headline

```yaml
type: custom:lg-headline
mode: greeting              # oder: status
name: Alex
weather: weather.home
watch:                      # Modus status: zählt mit, wenn die Regel zutrifft
  - entity: binary_sensor.waste_collection_tomorrow
    when: { state: "on" }
chips: []                   # wie bei lg-hero
```

### lg-now

```yaml
type: custom:lg-now
title: Jetzt dran           # Standard folgt der Sprache
max: 3                      # höchstens so viele Zeilen, in der geschriebenen Reihenfolge
hint: wechselt mit der Tageszeit
items:
  - title: Lichter noch an
    subtitle: "{state}"
    entity: light.all_lights
    when: { state: "on" }
    after: "22:00"
    before: "05:00"
    button:
      label: Alle aus
      tone: warm
      service: light.turn_off      # Ziel ist ohne Angabe die Entität der Zeile
  - title: Pflanzen gießen
    entity: sensor.plants_due
    when: { above: 0 }
    button: { label: Öffnen, action: navigate, path: /lovelace/household }
```

Aktionen eines Knopfs: `service` (wahlweise mit `data` und `target`), `action: toggle`, `action: navigate` mit `path`, oder ohne Angabe die Details der Entität. Eine Zeile ohne `button` ist reine Information.

### lg-rooms und lg-room

```yaml
type: custom:lg-rooms
floor: ground_floor         # alle Bereiche dieser Etage, nach Namen sortiert
areas:                      # aufgeführte Bereiche stehen vorn, in dieser Reihenfolge
  - living_room
  - area: kitchen
    name: Kochen
    icon: mdi:stove
    exclude: [light.kitchen_status_led]
extra:                      # einzelne Entitäten als Kachel, in Blau
  - entity: switch.media_rack
    name: Geräte
    icon: mdi:power-plug
columns: 2
```

So entscheidet eine Kachel:

- Sie sammelt die `light`-Entitäten des Bereichs, direkt zugeordnet oder über ihr Gerät. Versteckte Entitäten sowie Diagnose- und Konfigurations-Entitäten bleiben außen vor.
- Eine Lichtgruppe zählt nicht mit, wenn alle ihre Mitglieder im selben Bereich liegen. So wird kein Licht doppelt gezählt.
- Ist irgendein Licht an, schaltet ein Tippen alle aus. Sonst schaltet es alle ein.
- Halten öffnet die Bereichsseite. Das Ziel lässt sich mit `hold_path` ändern.
- Unter 460 px Breite fallen die Icons weg, damit die Namen lesbar bleiben.

### lg-list

```yaml
type: custom:lg-list
title: Zum Hauptbahnhof
icon: mdi:train
entity: sensor.next_trips                 # Zustand: "07:29 07:56 S9 (27 Min.) · 07:35 08:07 S8 (32 Min.)"
separator: " · "
pattern: '^(\S+) (\S+) (.+) \((.+)\)$'    # optional: jeden Teil in Spalten zerlegen
columns: ["{1} → {2}", "{3}", "{4}"]
note:                                     # steht oben rechts in Orange
  entity: sensor.disruption_text
  when: { state_not: [none, unknown, unavailable] }
items:                                    # weitere Zeilen, eine je Eintrag
  - label: Letztes Backup
    entity: sensor.backup_last_successful
  - label: System
    value: "84 · gut"
    tone: green                           # green, orange, red
  - lead: "09:00"
    label: Weekly
```

### lg-stat

```yaml
type: custom:lg-stat
entity: sensor.energy_today
label: Verbrauch heute
digits: 1
hours: 24        # Verlauf in der Kurve, 1 bis 168
graph: true
```

### lg-nav

```yaml
type: custom:lg-nav
items:
  - { label: Heute, icon: mdi:home, path: /my-dashboard/today }
  - { label: Räume, icon: mdi:lightbulb, path: /my-dashboard/rooms }
```

Als letzte Karte einer Ansicht einsetzen. Am Handy sitzt sie fest am unteren Rand und reserviert den Platz, den sie verdeckt. Ab 870 px Breite wird sie zu einer Reihe aus Pillen im normalen Fluss. Pfade müssen lokal sein und mit `/` beginnen.

### lg-agenda

```yaml
type: custom:lg-agenda
entities: [calendar.privat, calendar.arbeit]
days: 2                      # heute und morgen
max: 8
exclude: '^Privater Termin$' # Termine mit passendem Titel ausblenden
```

Ganztägige Termine stehen je Tag vorn. Beendete Termine von heute fallen weg. Die Termine kommen alle fünf Minuten über die Kalender-Schnittstelle von Home Assistant.

### lg-energy

```yaml
type: custom:lg-energy
statistics: [sensor.kueche_energie, sensor.buero_energie]   # optional
```

Ohne `statistics` addiert die Karte die obersten Geräte aus den Energie-Einstellungen (Geräte, die nicht in einem anderen enthalten sind); gibt es keine, nimmt sie den Netzzähler. Verglichen wird mit gestern bis zur gleichen Uhrzeit, mit der Vorwoche bis zum gleichen Wochentag und mit dem Vormonat bis zum gleichen Tag. Die Statistik wird alle zehn Minuten gelesen.

`lg-list` hat außerdem `zero_text` je Zeile (Text statt „0 parcels“) und `warn: {entity, when, text, label}`: trifft die Regel zu, wird die Karte bernsteinfarben, zeigt den Text als Hinweisband und das Label oben rechts. Mit `mode_entity` steht oben rechts sonst `mode_label` (Standard „direkt“).

### lg-parcels

```yaml
type: custom:lg-parcels
entity: sensor.parcel_raw_shipment_data     # Rohdaten-Sensor der Parcel-Integration
device_id: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4  # optional: Parcel-Gerät, zeigt den Plus-Knopf zum Hinzufügen
postcode: '10115'                           # optional: nur für Dienste, die sie brauchen (DPD Deutschland, PostNL)
keep_days: 2                                # zugestellte Sendungen bleiben so viele Tage, blass
max: 3                                      # weitere Sendungen hinter hide_empty: false                           # true: keine Karte, wenn nichts da ist
```

Braucht die Integration [Parcel](https://github.com/jmdevita/parcel-ha). Die Karte liest das Attribut `deliveries` des Rohdaten-Sensors. Statt einer Zahl schreibt sie ein bis zwei Sätze („Schuhe sind angekündigt. Bücher kamen gestern.“). Sendungen in der Zustellung sind gelb, verpasste Zustellungen, Abholungen und Probleme orange. Ein Tippen auf eine Sendung zeigt die letzten Ereignisse. Der Plus-Knopf öffnet das Formular in der Karte; der Paketdienst wird beim Tippen erkannt (`parcelapp.detect_carrier`), und wenn Parcel eine Nummer nicht zuordnen kann, wird er in der Auswahl gewählt (DHL-Paket-Nummern `JJD…` sind vorausgewählt). Hinzugefügt wird mit `parcelapp.add_parcel`. DPD Deutschland und PostNL wollen zusätzlich die Postleitzahl der Lieferadresse: dafür `postcode` setzen, was eine Parcel-Integration braucht, deren `add_parcel` sie annimmt. Hinzufügen braucht Parcel Premium, das etwa 20 Sendungen am Tag erlaubt; eine Ablehnung steht unter dem Knopf. Ereignistexte kommen vom Paketdienst in dessen Sprache; häufige Sätze der großen Paketdienste (Amazon, DHL, DPD, Hermes, GLS, UPS, Poste Italiane) erscheinen auf Deutsch oder Englisch, das Original steht im Tooltip, unbekannte Texte bleiben wie geliefert. Es geht nichts an einen Übersetzungsdienst.

### lg-idle (Wand-Displays)

```yaml
# auf der Hauptansicht
type: custom:lg-idle
after: 120                  # Sekunden ohne Berührung, Maus oder Tastatur
path: /mein-dashboard/ruhe
users: [Wand-Tablet]        # Benutzername oder ID; leer = alle
---
# auf der ruhigen Ansicht
type: custom:lg-idle
tap_path: /mein-dashboard/haupt   # das erste Tippen irgendwo führt zurück und löst sonst nichts aus
dim_after: "22:00"
dim_before: "06:00"
dim_opacity: 0.55
```

Die Karte selbst ist unsichtbar; am besten als letzte Karte in einen Abschnitt setzen. Gedimmt wird mit einer Abdunkelung über dem Bild, die Hintergrundbeleuchtung bleibt unverändert.

### lg-column (Desktop-Layouts)

```yaml
type: custom:lg-column
dock: 1                      # die letzte Karte sitzt unten im Panel
cards:
  - type: custom:lg-agenda
    entities: [calendar.privat]
  - type: weather-forecast
    entity: weather.home
```

Je eine Spalte in jeden Abschnitt einer dreispaltigen Sections-Ansicht setzen. Ab 870 px Breite reicht das Panel bis zum unteren Fensterrand, damit die Spalten einer Reihe auf derselben Linie enden, und die Karten darin verlieren ihr eigenes Glas. Darunter verschwindet das Panel, und jede Karte behält ihr Glas. `visibility` der Karten darin funktioniert wie in einem Abschnitt. `fill: false` behält die natürliche Höhe. Die Karten darin bearbeitest du mit der Kartenliste von Home Assistant unter dem Formular.

Weitere Optionen für dieses Layout: `all_off: true` bei `lg-rooms` (Knopf „Alle Lichter aus“ in der Kopfzeile), `show_header: false` bei `lg-now` und `lg-agenda`, `chips_position: below` bei `lg-headline` (Standard ist neben dem Titel auf breiten Bildschirmen).

## Theme-Variablen

Optional. Ohne sie nutzen die Karten eigene Werte.

| Variable | Verwendung |
|---|---|
| `--glass-bg` | Hintergrund von Karten und Kacheln |
| `--glass-blur` | Wert für `backdrop-filter` |
| `--glass-solid` | Hintergrund, wenn das System reduzierte Transparenz verlangt |
| `--primary-text-color`, `--primary-color` | Text und Fokusrahmen |
| `--ha-font-family-body` | Schrift |

## Barrierefreiheit

- Kacheln, Chips, Zeilen mit Aktion und Navigationseinträge sind echte Schaltflächen und Links: per Tastatur erreichbar, mit sichtbarem Fokusrahmen.
- Kacheln geben ihren Zustand an/aus weiter (`aria-pressed`).
- `prefers-reduced-motion` nimmt die Druck-Animation weg. `prefers-reduced-transparency` ersetzt Glas durch eine massive Fläche.

## Bekannte Grenzen

- Raum-Kacheln schalten nur Lichter. Rollläden, Klima und Medien gehören nicht zu einer Kachel.
- Die Farben sind auf dunkle Themes abgestimmt. Helle Themes funktionieren, der Kontrast ist dort aber nicht geprüft.
- Die Oberflächentexte gibt es auf Englisch und Deutsch. Andere Sprachen fallen auf Englisch zurück.
- Die Uhr folgt der Zeitzone von Home Assistant; Zeitfenster folgen der Geräteuhr.
- `lg-nav` ist am sichtbaren Fenster verankert. In einem Container mit CSS-Transform richtet sie sich an diesem Container aus.
- Nicht getestet: Safari älter als 16 (Container Queries), die Companion-Apps für Android und iOS in allen Versionen.

## Entwicklung

```bash
npm ci --ignore-scripts   # nur die Test-Abhängigkeit
npm run lint
npm test                  # baut vorher
```

Die Quellen liegen in `src/`, eine Datei je Karte. `tools/build.mjs` fügt sie zu `dist/liquid-glass-cards.js` zusammen. Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

MIT, siehe [LICENSE](LICENSE).
