# SPEAR Benchmark Website

Static GitHub Pages website for hosting the SPEAR Benchmark leaderboard, detailed model reports, model submission instructions, and contact information.

## Contents

- `index.html` - main single-page website with four tabs: Welcome, Benchmark, Add Your Model, and Contact Us.
- `styles.css` - website styling.
- `app.js` - tab navigation, benchmark CSV loading, model filtering, report links, and contact email handoff.
- `benchmark.csv` - copied leaderboard data for `seamless_2t_2s_questions`.
- `reports/` - copied generated HTML reports and graph assets for evaluated models.
- `assets/` - static website imagery.

## GitHub Pages

This site is static and can be served directly from a GitHub Pages repository. Put these files at the repository root, then enable GitHub Pages for the repository branch.

The benchmark table is loaded from `benchmark.csv` using `fetch()`, so it should be viewed through a web server or GitHub Pages rather than by opening `index.html` directly from the filesystem.

## Updating Results

1. Replace `benchmark.csv` with the latest generated benchmark table.
2. Copy each model's generated report directory into `reports/<model-name>/`.
3. If a new model has a detailed report, add the model name to `reportModels` in `app.js`.

## Contact Form

The contact form uses a `mailto:` link because GitHub Pages does not provide server-side email handling. Pressing Send opens the visitor's email client with a prefilled message to `tthebau1@jhu.edu`.

## License

This website is released under the MIT License. See `LICENSE`.
