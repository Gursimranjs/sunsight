# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Download, checksum and load the nine SPICE kernels (docs/REFERENCE.md). Run: `make kernels`.

`pipeline/kernels.lock.json` records each kernel's URL, size and SHA-256 from the first download;
later downloads must match it. load() asserts that MOON_ME resolves, that the station names exist and
that the Earth-orientation kernel covers 2027-01-01 to 2030-12-31.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import spiceypy as sp

from .contracts import DATA_RAW, REPO_ROOT, STATIONS
from .export import sha256_file

BASE = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/"
KERNELS = [  # load order matters: frames kernels after the PCKs they refer to
    "lsk/naif0012.tls",
    "pck/pck00011.tpc",
    "spk/planets/de440s.bsp",
    "pck/moon_pa_de440_200625.bpc",
    "fk/satellites/moon_de440_250416.tf",
    "fk/satellites/moon_assoc_me.tf",
    "pck/earth_2026_260806_2126_predict.bpc",
    "spk/stations/earthstns_itrf93_260814.bsp",
    "fk/stations/earth_topo_260814.tf",
]
KDIR = DATA_RAW / "kernels"
LOCK = REPO_ROOT / "pipeline" / "kernels.lock.json"
COVER_START_UTC = "2027-01-01T00:00:00"
COVER_END_UTC = "2030-12-31T23:59:59"
_loaded = False


def path_of(rel: str) -> Path:
    return KDIR / Path(rel).name


def all_present() -> bool:
    return LOCK.exists() and all(path_of(k).exists() for k in KERNELS)


def download() -> list[dict]:
    KDIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for rel in KERNELS:
        p = path_of(rel)
        url = BASE + rel
        if not p.exists():
            print(f"downloading {url}")
            tmp = p.with_suffix(p.suffix + ".part")
            subprocess.run(["curl", "-sSfL", "--retry", "3", "-o", str(tmp), url], check=True)
            tmp.rename(p)
        entries.append({"name": p.name, "url": url, "size_bytes": p.stat().st_size, "sha256": sha256_file(p)})
    return entries


def verify() -> None:
    lock = json.loads(LOCK.read_text())
    for k in lock["kernels"]:
        p = KDIR / k["name"]
        got = sha256_file(p)
        if got != k["sha256"] or p.stat().st_size != k["size_bytes"]:
            raise RuntimeError(f"checksum mismatch for {k['name']}: {got}")


def load() -> dict:
    """Furnish all kernels once and check frames, stations and Earth-orientation coverage."""
    global _loaded
    if not _loaded:
        for rel in KERNELS:
            sp.furnsh(str(path_of(rel)))
        _loaded = True
    # MOON_ME must resolve and be the frame the associations kernel names for the Moon.
    if sp.namfrm("MOON_ME") == 0:
        raise RuntimeError("frame MOON_ME does not resolve")
    et0 = sp.str2et(COVER_START_UTC)
    sp.pxform("MOON_ME", "J2000", et0)
    _, moon_frame = sp.cidfrm(301)
    # Stations and their topocentric frames.
    stations = []
    topo = []
    for code in STATIONS.values():
        sp.bodn2c(code)  # raises if unknown
        stations.append(code)
        if sp.namfrm(f"{code}_TOPO") == 0:
            raise RuntimeError(f"frame {code}_TOPO does not resolve")
        topo.append(f"{code}_TOPO")
    # Earth orientation (ITRF93, frame class id 3000) must cover the whole table window.
    cover = sp.cell_double(2000)
    sp.pckcov(str(path_of("pck/earth_2026_260806_2126_predict.bpc")), 3000, cover)
    et1 = sp.str2et(COVER_END_UTC)
    covers = any(
        sp.wnfetd(cover, i)[0] <= et0 and sp.wnfetd(cover, i)[1] >= et1 for i in range(sp.wncard(cover))
    )
    if not covers:
        raise RuntimeError("Earth-orientation kernel does not cover 2027-01-01 to 2030-12-31")
    return {
        "moon_frame": moon_frame,
        "stations": stations,
        "topo_frames": topo,
        "earth_orientation_covers": covers,
    }


def main() -> None:
    entries = download()
    if LOCK.exists():
        verify()
        print("checksums match kernels.lock.json")
    else:
        LOCK.write_text(json.dumps({"kernels": entries}, indent=1) + "\n")
        print(f"wrote {LOCK}")
    info = load()
    print(json.dumps(info, indent=1))


if __name__ == "__main__":
    main()
