# Reference shelf

The exact files, numbers, papers and prior entries behind the plan, checked on November 13, 2026. NASA updates these folders, so re-check names and sizes before downloading.

## SPICE kernels

All under [naif.jpl.nasa.gov/pub/naif/generic\_kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/). Together about 60 MB.

| File | Folder | What it does | Size |
| --- | --- | --- | --- |
| naif0012.tls | lsk/ | Leap seconds; converts UTC to SPICE time | Small |
| de440s.bsp | spk/planets/ | Positions of the Sun, Earth and Moon | 31 MB |
| pck00011.tpc | pck/ | Sizes and shapes of bodies | Small |
| moon\_pa\_de440\_200625.bpc | pck/ | The Moon's orientation, high precision | 12 MB |
| moon\_de440\_250416.tf | fk/satellites/ | Defines the MOON\_ME and MOON\_PA frames | Small |
| moon\_assoc\_me.tf | fk/satellites/ | Makes MOON\_ME the default Moon frame | Small |
| earthstns\_itrf93\_260814.bsp | spk/stations/ | Positions of the Deep Space Network stations | Small |
| earth\_topo\_260814.tf | fk/stations/ | Local horizon frames at each station | Small |
| earth\_2026\_260806\_2126\_predict.bpc | pck/ | Earth's orientation, predicted, for our whole window | 18 MB |

- The usual Earth-orientation file, earth\_latest\_high\_prec.bpc, ends on 8 February 2027, before most of our window. That is why the predicted file is on the list.
- The frames kernel ties MOON\_ME to the mean-Earth frame the LOLA maps use, to within about half a metre for 2000–2040.

## Terrain maps

**LOLA south polar maps** ([PGDA 90](https://pgda.gsfc.nasa.gov/products/90), Barker et al. 2023). Files sit under `https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/`. All are cloud-optimised GeoTIFFs in south polar stereographic metres, in the Moon's mean-Earth frame.

| File | Covers | Pixel | Size | Our use |
| --- | --- | --- | --- | --- |
| LDEM\_83S\_10MPP\_ADJ.TIF | 83°S to the pole | 10 m | 4.8 GB | Miss-test grids |
| LDEM\_80S\_20MPP\_ADJ.TIF | 80°S to the pole | 20 m | 2.6 GB | Near field |
| LDEM\_80S\_40MPP\_ADJ.TIF | 80°S to the pole | 40 m | 685 MB | Fallback near field |
| LDEM\_80S\_80MPP\_ADJ.TIF | 80°S to the pole | 80 m | 181 MB | Middle distances |
| LDEM\_60S\_240MPP\_ADJ.TIF | 60°S to the pole | 240 m | 210 MB | Far field, out to 300 km |

Each map has a matching height-error file (ending `_ERR.TIF`) for the paper's error bands, and the product includes ready-made slope maps (names starting `LDSM_`) for the slope screen.

**5 m site maps** ([PGDA 78](https://pgda.gsfc.nasa.gov/products/78), Barker et al. 2021). Separate maps for numbered candidate sites, with median height errors of 0.30 to 0.50 m. Match the site numbers to our targets on the product page before use.

**Illumination maps for validation** ([PGDA 69](https://pgda.gsfc.nasa.gov/products/69), method of Mazarico et al. 2011). Files sit under `https://pgda.gsfc.nasa.gov/data/MoonIllumination/`.

| File | Covers | Pixel | Holds |
| --- | --- | --- | --- |
| AVGVISIB\_85S\_060M\_201608\_COG.TIF | 85°S to the pole | 60 m | Average sunlight |
| AVGVISIB\_75S\_120M\_201608\_COG.TIF | 75°S to the pole | 120 m | Average sunlight |
| AVGVISIB\_65S\_240M\_201608\_COG.TIF | 65°S to the pole | 240 m | Average sunlight |
| AVGVISIB\_85S\_060M\_201608\_EARTH\_COG.TIF | 85°S to the pole | 60 m | Average Earth visibility |
| LPSR\_85S\_060M\_201608\_COG.TIF | 85°S to the pole | 60 m | Permanently shadowed areas |

Settings to copy before comparing: hourly steps over 18.6 years; the Sun as a disc; Earth counted as visible if any part of its disc is clear; polar stereographic grid with radius 1,737.4 km and true scale at the pole. Confirm the observer height on the product page.

## Key numbers

From our own calculation on November 13. Each is a unit test or a sanity check.

| Quantity | Value |
| --- | --- |
| Earth's shift between the Moon's centre and a surface site | Up to 0.26° |
| MOON\_PA instead of MOON\_ME | 0.029°, about 875 m on the ground |
| IAU\_MOON instead of MOON\_ME | Up to 0.005°, about 155 m |
| Sun's motion along the polar horizon | 0.51° per hour |
| Mixing UTC with SPICE time | 69 s, about 0.01° of Sun motion |
| Sun's apparent width | 0.52° to 0.54° |
| Earth's apparent width | 1.8° to 2.0° |
| A station's offset from Earth's centre | Up to about 0.9° |
| Surface drop from curvature at 100 km | 2.9 km, or 1.65° |
| Horizon dip on a smooth Moon | 0.09° at 2 m; 0.19° at 10 m |
| Map stretch in polar stereographic | 0.8% at 80°S; 1.7% at 75°S; 7% at 60°S |
| Farthest an 8 km peak stays visible from a site 2 km up | 250 km |
| Hourly rows for 2027–2030 | 35,064 |
| Hourly rows for 18.6 years | About 163,000 |
| Points in a miss-test grid (50 m spacing, 500 m radius) | About 320 |

## Papers and what to take from each

| Paper | Take from it |
| --- | --- |
| [Mazarico et al. 2011](https://doi.org/10.1016/j.icarus.2010.10.030), Icarus 211, 1066 | The horizon method; 240 m maps; hourly steps over 18.6 years; the conventions behind NASA's validation maps |
| [Gläser et al. 2014](https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G), Icarus 243, 78 | 20 m terrain; the connecting ridge is sunlit 92.27% of the time at 2 m and 95.65% at 10 m over 19 years; longest darkness of 3 to 5 days |
| Gläser et al. 2018, Planetary and Space Science 162, 170 | Illumination at both poles and what it means for exploration; read before writing the paper |
| [Speyerer and Robinson 2013](https://doi.org/10.1016/j.icarus.2012.10.010), Icarus 222, 122 | Illumination measured from orbital images, an independent line of evidence |
| [Barker et al. 2021](https://doi.org/10.1016/j.pss.2020.105119), Planetary and Space Science 203, 105119 | 5 m site maps; height errors of 0.3 to 0.5 m; terrain error matters much less 5 m above the surface; 100 terrain variants as a way to make error bands |
| [Barker et al. 2023](https://doi.org/10.3847/PSJ/acf3e1), Planetary Science Journal 4, 183 | The terrain maps we use, with their resolution and error maps |
| [JPL IPN Progress Report 42-216C](https://ipnpr.jpl.nasa.gov/progress_report/42-216/42-216C.html) | Radio links from the south pole: Earth stays low, so antennas point at most about 10° up and reflections cause slow fading |
| [NASA Lunar Surface Propagation one-pager](https://www.nasa.gov/wp-content/uploads/2026/10/lsp-one-pager-digital.pdf) | NASA's current work on how terrain affects lunar surface radio links |

## Public entries seen

Read for awareness only. Do not copy code or text from them.

| Entry | What it already does |
| --- | --- |
| [BroBYW/CLPS-Lunar-Mission-Website](https://github.com/BroBYW/CLPS-Lunar-Mission-Website) | Terrain horizons every 0.1° out to 300 km; 2 m and 10 m observers; 10-minute steps; checks against Horizons and against Gläser's figures (within 1.5 points) |
| [NetRunnerXD/lunar-horizon-wheel](https://github.com/NetRunnerXD/lunar-horizon-wheel) | Sun disc with a dimmer edge; Deep Space Network contact with a 10° rule; error ranges; comparison with NASA's maps (mean difference −0.87 points, spread 4.55 points) |
| [dundaryusuf566-maker/clps-lunar-browser](https://github.com/dundaryusuf566-maker/clps-lunar-browser) | Trajectories, thermal estimates and a registered forecast |

These set the bar: terrain shadows, a Sun disc and a check against NASA's maps are now expected. None of the three tests what happens when the lander misses its target.
