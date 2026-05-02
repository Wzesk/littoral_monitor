# Data Requirements

Classification of UI data needs against available pipeline outputs.
**Status**: met | derivable | missing (not yet produced by any pipeline)

---

## Site metadata

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Site name, periodic flag | All tabs | **met** | BQ `islands.site_name`, `.periodic` |
| Site location / coords | Topbar, SiteView | **derivable** | BQ `islands.aoi_coordinates` → centroid |
| AOI bounding box | SiteView (map fit) | **met** | BQ `islands.aoi_coordinates` |
| Shoreline perimeter (m) | NowView KPI, topbar | **met** | BQ `shoreline_data.shoreline_length_m` (latest obs) |
| Monitoring start date | DataView | **met** | BQ `islands.start_date` |
| Operator name | ChatView avatar | **met** | hardcoded "coastal assembly" |

---

## Shoreline observations (DataView, SiteView)

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Observation date | DataView table | **met** | BQ `shoreline_data.timestamp` |
| Shoreline length (m) | DataView table | **met** | BQ `shoreline_data.shoreline_length_m` |
| Area enclosed (m²) | DataView table, NowView | **missing** | Not computed by pipeline — GeoJSON geometry exists, area calculation needed |
| GeoJSON URL | SiteView map layers | **met** | BQ `shoreline_data.geojson_path` → GCS `littoral-public-data` |
| Tide corrected flag | DataView table | **met** | BQ `shoreline_data.tide_corrected` |
| Source satellite | DataView table | **derivable** | BQ `shoreline_data.metadata.source_file` — T-code pattern identifies Sentinel-2 tile; PlanetScope not yet in pipeline |
| Cloud cover % | DataView table | **missing** | Not tracked in pipeline; would require L1C metadata |
| Quality score | DataView table | **missing** | BQ `shoreline_data.quality_score` always NULL; needs `littoral_infer` quality step |

---

## Inferred / decomposition timeseries (TrendsView, NowView, AnalyticsView)

These all depend on `littoral_infer` completing inference + decomposition steps.
For Vakharu only the **substrate** step has run (135 obs loaded, baseline built).
No NPZ outputs exist yet.

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Daily area timeseries (mean + σ) | TrendsView (merged), NowView sparkline | **missing** | `littoral_infer` → `X_daily.npz`: `X_daily_mu`, `X_daily_sg` |
| Decomposition: trend component | TrendsView (decomposed), NowView | **missing** | `littoral_infer` → `stl_bands.npz`: `trend` (N_baseline × n_daily) |
| Decomposition: seasonal component | TrendsView, AnalyticsView | **missing** | `littoral_infer` → `stl_bands.npz`: `seasonal` |
| Decomposition: residual component | TrendsView, AnalyticsView | **missing** | `littoral_infer` → `stl_bands.npz`: `residual` |
| Per-transect 5-year net change | AnalyticsView (TransectBars) | **missing** | Derived from `stl_bands.npz` `trend`: last value − first value per transect |
| Per-transect seasonal amplitude | AnalyticsView (TransectBars) | **missing** | Derived from `stl_bands.npz` `seasonal`: max abs per transect |
| 90-day nearcast + confidence band | NowView forecast card | **missing** | `X_daily.npz` future extension of `daily_days` beyond last observation |
| Net seasonal change (area, %) | NowView KPI | **missing** | Derived from `X_daily.npz`: difference over last 12 months |
| Quality metrics (RMSE, flagged dates) | DataView quality col | **missing** | `littoral_infer` → `quality_metrics.json` (per-observation chamfer/RMSE) |

**Action needed**: Run `littoral_infer` for all sites through inference + decomposition steps.
Outputs will be at `gs://littoral-inference-outputs/{site_id}/{run_id}/`.

---

## Health, hotspots, and alerts (NowView)

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Health status (ok / monitor / act) | NowView headline, topbar pill | **derivable** | Once infer data available: classify from trend rate + hotspot count |
| Hotspot locations + rates | NowView hotspot grid, SiteView pulses | **derivable** | From `stl_bands.npz` `trend`: find transects with rate > threshold |
| Hotspot priority classification | NowView | **derivable** | From trend rate magnitude and residual variance |
| Drift direction and rate | NowView drift card | **derivable** | From `stl_bands.npz` `trend` spatial gradient along shoreline |
| Sediment budget (m³/yr) | NowView drift card | **missing** | Requires cross-shore profile / volumetric model; not in any pipeline |
| Storm events | NowView events feed, TrendsView markers | **missing** | No event detection pipeline; would require residual spike detection |
| Intervention events | NowView events, AnalyticsView | **missing** | Not tracked; would require manual entry or deployment log |

---

## Forcing data (SiteView forcing panel)

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Significant wave height Hs (m) | SiteView forcing panel | **met** | BQ `shoreline_forcing.significant_wave_height` |
| Peak wave period Tp (s) | SiteView forcing panel | **met** | BQ `shoreline_forcing.peak_wave_period` |
| Mean wave direction (°) | SiteView forcing panel | **met** | BQ `shoreline_forcing.mean_wave_direction` |
| Ocean current speed (m/s) | SiteView forcing panel | **met** | BQ `shoreline_forcing.ocean_current_speed` |
| Ocean current direction (°) | SiteView forcing panel | **met** | BQ `shoreline_forcing.ocean_current_direction` |
| Tidal height / tidal predictions | SiteView forcing panel | **missing** | `littoral_forcing` uses FES2022 for tidal correction only; time-series tidal predictions not stored |
| Forcing coverage | — | **partial** | Vakharu: Jan 2019 only (1442 rows). Full historical backfill not yet run for all sites. |

---

## Forecast scenarios (AnalyticsView)

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Do-nothing 12/36-month delta | AnalyticsView scenarios | **missing** | No scenario model; currently all synthetic |
| Maintain/expand/nourish scenarios | AnalyticsView scenarios | **missing** | Requires management response model |

---

## Satellite base map (SiteView)

| Requirement | UI Location | Status | Source |
|---|---|---|---|
| Satellite tile base map | SiteView | **met** | Mapbox satellite-streets-v12; token in `.env.local` |
| Esri fallback | SiteView | **met** | Esri World Imagery (no token required) |

---

## Summary counts

| Status | Count |
|---|---|
| **met** | 14 |
| **derivable** (once infer runs) | 10 |
| **missing** | 12 |

The largest blockers are: (1) running `littoral_infer` inference + decomposition steps for each site, and (2) computing `area_enclosed_m2` from the GeoJSON geometries in the pipeline.
