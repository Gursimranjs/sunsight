// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
export interface FileRef { id?: string; meta: string; bin?: string; masks?: string; masks_dz?: string }

export interface Manifest {
  format_version: number;
  fixture: boolean;
  generated_with: string;
  pipeline_version: string;
  build_time_utc: string;
  kernels: string[];
  inputs: { name?: string; url: string; size_bytes: number; sha256: string }[];
  files: {
    ephemeris: { meta: string; bin: string };
    sites: string;
    regions?: FileRef[];
    miss?: FileRef[];
    terrain?: FileRef[];
    validation?: string;
  };
  outputs: { path: string; size_bytes: number; sha256: string }[];
}

export interface EphemerisMeta {
  fixture?: boolean;
  start_utc: string;
  step_s: number;
  row_count: number;
  columns: string[];
  frame: string;
  correction: string;
}

export interface Ephemeris {
  meta: EphemerisMeta;
  /** Row-major float32, row_count x 18. */
  data: Float32Array;
  /** Start of row 0 in Unix milliseconds (UTC). */
  start_ms: number;
}

export interface Site {
  id: string;
  name: string;
  lat_deg: number;
  lon_deg: number;
  height_m: number;
  category: string;
  region_id: string | null;
  miss_target_id: string | null;
  terrain_id: string | null;
  source_url: string | null;
  fixture?: boolean;
  [key: string]: unknown;
}
