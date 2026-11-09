# Living Desktop – lokale Testversion, Phase 1

## Update: PLZ-Suche und drei zusätzliche Designs

Die Ländereingabe ist jetzt eine echte Auswahl mit Deutschland als Standard. Deutsche PLZ werden als Text behandelt, damit führende Nullen erhalten bleiben; Eingaben mit weniger als fünf Ziffern erhalten eine verständliche Meldung. Für Deutschland, Österreich und die Schweiz funktioniert die PLZ-Zeitzone unabhängig von einem zweiten Wetterdienst-Aufruf. Getestete Suchen: 10115 (Berlin), 01067 (Dresden), Dresden als Stadtname, 1010/AT (Wien) und 8001/CH (Zürich). Auswahl und Standortübernahme wurden im Windows-Host geprüft.

Neu in der Designauswahl: **Lagoon Islands**, **Cloud Garden** und **Liquid Colours**. Alle drei sind eigene prozedurale WebGL2-Designs mit gemeinsamem Renderer, Icon-Anpassung, Sonnenzustand, Vorschau und gespeicherten Parametern für Flächengröße, Geschwindigkeit, Details und Palette. Bestehende gesperrte Deskland-Designs bleiben unverändert. Neue Vorschaubilder liegen getrennt unter `prototype/living-thumbs`.

Alle drei Designs wurden im echten Windows-Host auf Shaderfehler, Themenwechsel, Parameteränderungen, Aus-/Einblenden der Icon-Bereiche, Nachtabschaltung und Bildexport geprüft. Ein MP4-Export des gemeinsamen Renderers wurde erfolgreich erzeugt. Live-Wetter ist weiterhin die nächste Phase.

Basis: Deskland Preview, Commit 9818b577402ff476e1b59da07970c56472713126. Die Weiterentwicklung liegt im eigenen Fork `drc85/Deskland-REALTIME`, Branch `living-desktop/realtime-sun-shadows`. Eine Übersicht für das Repository steht in `LIVING-DESKTOP-CHANGES.md`.

## Enthalten

- Eigenes Fenster „Location & sun“, erreichbar über die Schaltfläche oben.
- Stadt- und PLZ-Suche mit Ländercode (z. B. DE), Trefferwahl und Speicherung. PLZ benötigen einen Ländercode.
- Offline-Eingabe von Koordinaten und IANA-Zeitzone.
- Live-Zeit des Ortes, Datum-/Zeitvorschau und Zeitraffer.
- Gemeinsame Sonnenberechnung nach den kompakten NOAA-Gleichungen, einschließlich Polartag/-nacht und Sommerzeitbehandlung bei Vorschau-Eingaben.
- Bildschirm-Sonnenlauf von links oben nach rechts; kleinere Schatten in Gegenrichtung, weiche Icon-Schatten und Größenregler. Nachts keine Sonnenschatten.
- Beach und Meadow einschließlich Palmen, Kajaks, Wolken und Figuren an den gemeinsamen Lichtzustand angebunden.
- Shell-basierte Alphamasken für zuordenbare echte Desktop-Icons. Keine Desktop-Screenshots. Nicht eindeutig zuordenbare Icons bekommen keine erfundene Silhouette.
- Kontinuierlicher Terrain-Morph bei schnell folgenden Icon-Paketen. Meadow baut die Umgebung auch beim pausierten Erststart auf.

## Start und Test

Im übergeordneten Desktop-Ordner „Start Living Desktop.exe“ öffnen. Der Launcher nutzt den Ordner `Daten` für getrennte Testeinstellungen und schreibt keinen Autostart-Eintrag. Die Anwendung zeigt intern weiterhin den ursprünglichen Namen „Deskland Preview“; dies ist eine lokale Entwicklungsfassung.

1. „Location & sun“ öffnen, `10115` und `DE` suchen, den Treffer Berlin auswählen.
2. „Preview / time lapse“ wählen, ein Datum und eine Ortszeit eintragen, „Apply preview“ drücken. Geschwindigkeit `Still` hält die Uhrzeit an.
3. Morgen, Mittag, Abend und Nacht vergleichen. Der Größenregler verkleinert/vergrößert alle Sonnenschatten.
4. Zurück zu „Live local time“ wechseln.
5. Beach/Meadow wechseln, ein echtes Desktop-Icon verschieben, Pause/Wiederaufnahme testen.
6. Zum Beenden das Tray-Menü verwenden. Das Schließen des Einstellungsfensters allein beendet das Wallpaper nicht.

## Geprüft und Grenzen

Windows-x64-Build erfolgreich. Beide Designs wurden im echten WebView2-Host auf 1920 × 1080 geprüft, ohne gemeldete WebGL-Fehler. PLZ 10115/DE lieferte Berlin. Nachtvorschau setzte die Sonnen-Schattenstärke auf null. Vorschau mit simuliertem Verschieben und Aus-/Einblenden der Icons lief weiter. Bildexport wurde geprüft. Automatische Solarprüfungen: `node tests/solar.cjs`.

Shell-Masken stimmen nicht zwingend pixelgenau mit jeder Explorer-Darstellung überein. Die Testmaschine lieferte Masken für 18 von 20 erfassten Einträgen. Die Maske wird aus dem Shell-Icon abgeleitet; Explorer-Rechtecke enthalten zusätzliches Padding, das im Renderer angenähert wird. Miniaturbilder, besondere Overlays und mehrdeutige Anzeigenamen benötigen weitere Verfeinerung. Die kleinen weichen Schatten kaschieren diese Abweichungen, ersetzen aber keine pixelgenaue Explorer-Erfassung.

Noch keine gemessene Freigabe für 4K, gemischte DPI, mehrere Monitore oder alle Windows-Versionen. Wie die Basis unterstützt diese Fassung den Hauptmonitor. Wetter und Flip-Clock sind noch nicht implementiert.

## Nächste Phase: gemeinsames Live-Wetter

Alle Designs sollen dieselbe Wetterebene erhalten: fallender Regen und laufende Scheibentropfen, Nebelschwaden, windabhängige Bewegungsintensität, Schneefall mit zunehmender und langsam abtauender Ablagerung sowie Gewitter mit Verdunklung, kurzen Blitzen, Regen und Wind. Standort aus Phase 1 wiederverwenden; Live-Daten plus manuelle Wettervorschau. Nicht mit dieser Testversion als bereits fertig ausliefern.

## Quellen und Hinweise

- Sonnenmodell: https://gml.noaa.gov/grad/solcalc/solareqns.PDF (kompakte Näherung; keine präzise astronomische Ephemeride).
- Stadt-Suche: Open-Meteo / GeoNames, https://open-meteo.com/en/docs/geocoding-api
- PLZ-Suche: Zippopotam.us / GeoNames, https://api.zippopotam.us/ ; ODbL/Database Contents License laut Dienst.
- Zeitzonenauflösung für PLZ: Open-Meteo, https://open-meteo.com/en/docs
- Nur eine ausdrücklich gestartete Suche sendet Suchtext/Ländercode bzw. Trefferkoordinaten. Die Sonnenberechnung selbst funktioniert offline.
- Quellcode/Assets und Drittanbieterbedingungen: siehe LICENSE, NOTICE, THIRD_PARTY_NOTICES.md und TRADEMARKS.md.
