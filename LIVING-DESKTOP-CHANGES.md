# Living Desktop: realtime sun, shadows and location controls

This development branch extends [Deskland Preview](https://github.com/BLEZZ0102/Deskland) with a shared sun and lighting system. The scene now follows the selected location and time instead of using fixed daytime colours and fixed shadow directions. It also adds city/postal-code search, a time-preview window and three original adaptive designs.

Based on upstream commit `9818b577402ff476e1b59da07970c56472713126`. The local test build version is `0.1.4`. This is an independent fork; it is not an official Deskland release.

## Sun and day/night lighting

- A shared offline solar module calculates solar elevation, azimuth and approximate sunrise/sunset using NOAA's compact equations.
- All five available designs use the same global location, time and lighting state.
- Scene brightness and colour change through daylight, dusk and night.
- Polar day and polar night are handled without inventing sunrise/sunset times.
- Live time follows the selected location's IANA time zone.
- Preview inputs account for daylight saving: nonexistent local times are rejected; an ambiguous autumn time selects its earlier occurrence.
- The visual sun path deliberately travels from the upper left at sunrise to the right at sunset. This is an artistic screen mapping; shadow direction does not directly reproduce geographic azimuth.

The solar calculation runs locally after a location has been selected. It does not need continuous network access.

## Sun-driven shadows

- Shadows point away from the screen sun and change length with solar elevation.
- Low sun produces longer shadows; high sun produces shorter shadows. Projection lengths are capped near the horizon.
- Directed sunlight shadows fade out around sunset and disappear at night.
- Shadows default to a smaller size, with a global size slider and softer icon edges.
- Meadow cloud shadows, character/kite projections, cat shadows, Beach kayak shadows and palm projections use the shared solar state.
- Palm artwork and projected shadows are separated instead of baking a fixed shadow into the texture atlas.
- A local-only overlay draws shadows from Shell-derived icon alpha silhouettes. Desktop screenshots are not used, and filenames are not sent to the renderer.

Icon silhouettes are still experimental. Shell artwork can differ from Explorer thumbnails or overlays, and icon-cell padding is approximated. Ambiguous or unmatched items are skipped rather than given an invented silhouette. The development machine matched 18 of 20 entries. The overlay is separate from the image/video export canvas, so real icon silhouettes are excluded from those exports.

## City and postal-code search

- A dedicated **Location & sun** window is accessible from the settings header.
- Search by city or postal code, select a matching result, and save its coordinates and time zone.
- A real country dropdown replaces the former empty field whose `DE` placeholder looked like an actual selection. Germany is selected by default.
- Postal codes remain strings, preserving leading zeros such as `01067`.
- German numeric postal codes are validated as five digits; optional `D-`/`DE-` prefixes are normalized.
- City search uses Open-Meteo; postal lookup uses Zippopotam.us/GeoNames where supported.
- German, Austrian and Swiss postal results have their known time zones assigned directly, avoiding a second network dependency. Other supported countries use coordinate-based time-zone lookup.
- Search failures, empty results and timeouts are displayed without leaving the search button permanently disabled.
- Manual coordinates and an IANA time zone remain available for offline configuration.

Only an explicitly started search sends search text, the selected country and, when required, result coordinates to the lookup services. There is no automatic device-location request. Postal-service coverage varies by country.

## Time preview

Choose **Preview / time lapse**, enter a date/time at the selected location, then select **Apply preview**. Playback supports a still preview and 1×, 60×, 600× or 3600× time. **Live local time** returns to the real clock. Previewing does not change the Windows system clock.

## Three additional original designs

| Design | Appearance |
| --- | --- |
| **Lagoon Islands** | Moving clear water, caustics and soft sand islands around icons; turquoise and blue palettes. |
| **Cloud Garden** | Animated cloud banks around icons, drifting wisps, blue-sky and sunset palettes. |
| **Liquid Colours** | Organic flowing colour pools with Jade, Lilac, Amber and Dusk palettes. |

These designs share a procedural WebGL2 renderer, smoothly changing icon fields and the common solar state. Each stores its own area-size, animation-speed, detail and palette settings. Original SVG thumbnails are kept separately from upstream thumbnails. Existing locked-theme entries remain locked; their missing implementation was not reused or unlocked.

## Stability and integration changes

- New icon packets continue terrain transitions from the currently visible mixed field, reducing jumps during rapid updates.
- Meadow completes its first icon-dependent scene even if pause arrives during startup.
- Settings, global environment state and previews are synchronized through the existing host communication path.
- JSON serialization is protected against concurrent host/search-worker access.
- The test launcher uses a separate profile directory and suppresses autostart changes in that isolated profile.
- Settings resources use a versioned cache key so updates load the new country selector, registry and translations.

## Validation

The development session verified:

- Successful Windows x64 build with the existing .NET Framework/WebView2 build script.
- `node tests/solar.cjs`: sunrise/sunset sanity checks, screen-direction changes, night shadows, polar regions, DST edge cases, time zones and finite projections.
- Live postal searches for `10115/DE` (Berlin), `01067/DE` (Dresden), `1010/AT` (Vienna), `8001/CH` (Zurich), plus the city name Dresden and result selection.
- All three new designs in the real WebView2 host at 1920 × 1080: page loading, no reported WebGL errors, parameter changes, icon-region hide/show, night shadow strength and image export.
- MP4 export from the shared new-design renderer; existing Beach/Meadow export and pause/resume checks during Phase 1.
- Desktop package startup with saved user settings preserved.

These are development checks, not certification across all Windows versions, GPUs or display configurations. The only committed automated test suite here is `tests/solar.cjs`; the native-host checks were performed during development.

## Current limits and next steps

- Only the primary monitor is supported, as in the upstream base.
- Shell-derived icon masks need further work for pixel-exact thumbnails and special overlays.
- The compact solar model is an approximation, not a precision ephemeris. Screen lighting is an artistic interpretation of calculated solar conditions.
- No broad 4K, mixed-DPI or multi-monitor performance validation has been completed.
- **Live weather is not implemented yet.** The planned shared layer includes falling rain and glass droplets, fog, wind-responsive movement, accumulating/melting snow and thunderstorms with darkening, short flashes, rain and wind.
- The configurable flip-clock and design builder remain later work.

## Build and licensing

Build the Windows host with `powershell -ExecutionPolicy Bypass -File host\build.ps1`; run `host\bin\Deskland.exe`. For the browser preview, run `node prototype\serve.mjs` and open `http://localhost:5178/settings.html`. Real desktop-icon adaptation requires the Windows host. See the original README and [local test notes](LIVING-DESKTOP.md) for more details.

Source code and included assets retain the upstream GPL-3.0 notices. See [LICENSE](LICENSE), [NOTICE](NOTICE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [TRADEMARKS.md](TRADEMARKS.md). No compiled EXE, personal settings, desktop captures or local logs are included in this source branch.
