# Source research and curation ledger

Reviewed October 24, 2026. Source records and retrieval snapshots are retained in `data/raw`; production facts are in `data/processed/catalog.json`. Coverage is measured from the populated PostgreSQL database, not from the number of files discovered online.

| Source | Inspected contents | Imported / staged | Limits |
|---|---|---|---|
| [NYC Subway Bullets Font](https://github.com/nyumathclinic/nyc-subway-bullets-font/tree/1d2a6b05bf5ea7ec43c6ed608d1eb739f16089e4) | Actual repository tree, README, set configuration, credits, source manifest, and seven TSV mappings (`std`, `helv`, `nycta`, `r62a`, `r32`, `retired`, `legacy`) | 275 distinct artwork filenames staged in `artwork_review_queue.json`; zero automatically promoted designs | CC0 mapping/config data; source graphics have per-file licenses. Fonts/artwork are not authenticated physical rollsign specimens. Set names do not establish equipment compatibility or font identification on trains. Duplicate filenames across sets collapse into one staged item. |
| [Commons rollsign category](https://commons.wikimedia.org/wiki/Category:New_York_City_Subway_rollsigns) | Actual file listing plus 16 selected file records, metadata, dimensions, attribution, licenses, and original images | 15 curated physical designs and 15 photo references/observations. One shuttle destination-text photo was excluded because it does not show a distinctive route bullet. | Category mixes authentic photographs, reconstructed SVGs, GIF recreations, destinations, and unusual settings. Filename alone does not establish manufacture history or service operation. |
| [MTA Colors](https://data.ny.gov/resource/3uhz-sej2.json) and [official color sheet](https://www.mta.info/document/168976) | Actual JSON service/HEX rows and official color sheet | Current digital classification colors for ten separately identified current groups | Colors are not direct evidence of physical rollsign ink, paint, fading or photographed color. The document also has an orange RGB/HEX inconsistency: HEX `#EB6800` implies red 235, while its printed RGB text says 238. JSON HEX is retained without silently resolving that discrepancy. |
| [MTA text maps](https://www.mta.info/maps/subway-line-maps) | Published list of currently operating route designations and descriptive service names | 23 current designations, including umbrella S | Not a real-time schedule or operational line ontology. S covers three shuttle services. |
| [MTA Subway Rolling Stock](https://data.ny.gov/resource/kir5-i9xt.json) | 10,001 inventory rows; model IDs, divisions, per-car service dates and retirement text | 16 model IDs; unambiguous division values only; aggregate snapshot retained | Contradictory active flags for retired equipment, differing object/class descriptions, and A/B records for R62A. Do not infer model introduction year from a car's in-service date. Raw car counts are not used as verified active fleet counts. The full response is retained locally in `data/raw/downloads/stock-full.json`. |
| [Official R32 retirement announcement](https://apps.cio.ny.gov/apps/mediacontact/public/view.cfm?parm=12753DF1-CBC4-F293-E86500F6AF3BFA31_563F3423-F74E-DA2D-7B014B68912BDB37) | MTA announcement, December 10, 2021; manufacturer, first revenue service, scheduled final farewell | Budd, 1964 introduction, 2022 retirement, historical equipment status for R32 | Takes precedence over contradictory open-inventory active flags. Does not date the photographed brown R sign's manufacture. |
| [Commons subway-bullet history](https://commons.wikimedia.org/wiki/New_York_City_Subway_bullets) | Historical narrative and changes in route designations | Historical classification of 9, blue K, V, JFK Express | Community information is labeled as such. Exact route-history dates and earlier unrelated K identities were not added. |
| [nycsubway.org R32 archive](https://nycsubway.org/wiki/R-32_%28Budd%2C_1964%29) | Archive discovered and investigated as an additional historical reference | No artwork or photograph corpus imported | Further individual-image rights and claim review needed before importing its collection. |
| [MTA developer resources](https://www.mta.info/developers) / route diagrams | Current diagram and dataset links; guidance on using data versus licensed symbols | Investigated; no MTA diagram artwork redistributed | Official graphics, trademarks, dataset access, and third-party photo licenses are separate questions. The reference importer does not assume official artwork is freely redistributable. |

## Current official group colors

| Identifier | Current sourced HEX | Prompt's preliminary HEX |
|---|---|---|
| blue | #0062CF | #0039A6 |
| orange | #EB6800 | #FF6319 |
| green | #009952 | #00933C |
| red | #D82233 | #EE352E |
| purple | #9A38A1 | #B933AD |
| yellow | #F6BC26 | #FCCC0A |
| brown | #8E5C33 | #996633 |
| light_green | #799534 | #6CBE45 |
| gray / shuttle_gray | #7C858C | #A7A9AC |

The initial values were not inserted as current official specifications. No date of a physical sign color transition is inferred. The separate `historical_jfk` group has no asserted HEX value.

## Design-level decisions

- The illuminated circle/diamond 6 assemblies are distinct hybrid designs, separate from the plain end rollsign 6. The illuminated diamond is not mislabeled as a green physical diamond bullet.
- A brown diamond R sign does not change current R classification from yellow to brown. Retired R32 equipment does not change R to Not in Service.
- K, V, and JFK Express signs are classified Not in Service. Historical Q and brown R designs remain under active Q and R routes.
- Unused 10 and 13 are physical sign candidates with unknown route classification. They are not fictional operating routes and are not silently assigned to the route named in a photograph title.
- Visual review corrected the 3 photograph to a side assembly. The photo's train model is explicitly named R62, but no end-position claim is retained.
- The 7 file calls its indicator LCD. The catalog records the hybrid assembly and a review issue without asserting an LED/LCD subtype.
- Photographic lighting and fading do not create new designs. Exact HEX, font, manufacturing dates, and uncertain equipment remain null. Layout and illuminated indicators, rather than camera color differences, distinguish these records.

## Retrieval and licenses

The collector records URLs, access timestamps, and SHA-256 snapshots in `retrievals.json`. The original car-inventory response is local-only; the shared aggregate retains its transformations in the collector. MTA route maps and historical text were reviewed through their public pages; full copyrighted documents are not copied into this repository. Source notes preserve which claims came from those pages.

Commons initially returned an HTTPX 403 for a metadata refresh; an earlier successful public API response was retained, with that fact recorded in the retrieval ledger. Original-image downloads subsequently encountered a 429. Requests were paused and the remaining downloads completed with five-second spacing. No restricted or paywalled source was used. Rebuilding from retained snapshots needs no network access.

All 16 downloaded photos have individual free licenses and attribution; 15 are attached to the database. Original files are unmodified, stored locally, and excluded from Git. Per-file SHA-256, original Commons SHA-1, licensing, creator, source URL, dimensions, and attribution are retained. No source SVGs or font binaries are redistributed as physical evidence.

## Next collection work

1. Expand front/rear photographic coverage and associate additional photographs with existing designs before creating new identities.
2. Find manufacturer/manual evidence for typography, rollsign generation, dimensions, physical colors, and equipment compatibility.
3. Review staged R62A/R32/retired artwork against physical evidence; add reconstructed reference metadata only when a correspondence is supported.
4. Add historical operational route identities and sourced group-history rows where a reused route character would otherwise conflate distinct services.
5. Establish an evaluated photograph benchmark before choosing identification thresholds or claiming accuracy.
