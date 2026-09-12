# datadex solutions — studio website

Static marketing site for datadex solutions, a full-stack software studio. Plain HTML,
CSS and one dependency-free JavaScript file. No build step.

The interaction layer (`assets/js/script.js`) adds the staged hero load, the
particle fields, scroll reveals, counting stats, the tabbed services showcase,
the stacking work cards, the stack terminal, the review spotlight and the
mobile menu. The terminal and the spotlight are built from the plain lists in
the HTML, so edit the lists and both update. Every effect is
optional: the page renders fully without JavaScript, and `prefers-reduced-motion`
switches the motion off.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 5500
# then open http://localhost:5500
```

## Deploy to GitHub Pages

1. Create a new repository on GitHub (for example `datadex-solutions`).
2. Push this folder to it:

   ```bash
   git init
   git add .
   git commit -m "Initial datadex site"
   git branch -M main
   git remote add origin git@github.com:ShahzaibAyyub/datadex-solutions.git
   git push -u origin main
   ```

3. In the repository go to **Settings → Pages** and set **Source** to
   **GitHub Actions**. The workflow in `.github/workflows/pages.yml` publishes
   the site on every push to `main`.
4. The site will be available at
   `https://shahzaibayyub.github.io/datadex-solutions/`.

To use a custom domain, add a `CNAME` file containing the domain to the
repository root and point the domain's DNS at GitHub Pages.

## Editing content

Everything lives in `index.html`:

- Hero and Fiverr order card: the `.hero` section.
- Services: the `#services` section. Each tab is a `.showcase-tab` button and
  each panel a `.showcase-panel`; keep their `aria-controls` / `id` pairs in sync.
- Projects: the `#work` section. Each project is one `<li class="work-item">`;
  the cards stack over each other as the page scrolls. Banner images are in
  `assets/images/` and display at 16:9.
- Stack, process, reviews, team and contact follow in order.

Colours and type are defined as custom properties at the top of
`assets/css/style.css`.
