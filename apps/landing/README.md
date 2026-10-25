# TrainDex landing page

The one-page advertisement lives in this repository at `apps/landing`, alongside `apps/api` and the Python reference backend. It is a standalone static site: no dependencies, API keys or backend services are required.

From the repository root:

```bash
python3 -m http.server 5173 --bind 127.0.0.1 --directory apps/landing/dist
```

Open <http://127.0.0.1:5173>. Edit `dist/index.html`, `dist/styles.css`, and `dist/script.js` directly. `dist` is the canonical, checked-in source and deployable directory; there is no build step. The nested `.openai/hosting.json` identifies this landing page's private Sites deployment, not the backend.

The page introduces the product, explains the intended spotting experience, and offers an interactive example-bullet gallery. All collection/identification screens are labeled previews; the page does not take photos, perform identification, collect email addresses, or save collections. Its GitHub links point to the existing project.

The visual theme follows `apps/web/src/index.css`: uppercase Courier typography, the teal checkerboard, cream panels, navy pixel borders, gold buttons, and foil trading cards. The logo and favicon are copied from the game's assets into `dist/assets` so this page stays independently deployable. Update those copies if the game's branding changes.

The gallery is ordered express 6, express 7, yellow B, orange Q. Every card includes service years, route, purpose, and current status or the reason that color/route version ended. History panels link their sources; the active express services also link MTA timetables. The 6 and 7 dates describe the express services, which predate the displayed bullet designs. The default express 6 history is also rendered in HTML; keep it consistent with its entry in `dist/script.js` when editing the copy.

Photo: [R62A 6 Train 033.jpg](https://commons.wikimedia.org/wiki/File:R62A_6_Train_033.jpg), Kidfly182, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The original image is retained as `dist/assets/6-rollsign.jpg`; CSS layout crops its display. The page includes visible source/license attribution in its footer.

The marketing page and API can be deployed independently from the same repository. When the application has a stable public URL, replace or supplement the GitHub CTA with that URL.

## GitHub Pages and a Porkbun domain

The repository includes `.github/workflows/deploy-landing.yml`. It deploys only `apps/landing/dist` when the landing page or workflow changes on `main`, and can also be run manually. It does not publish the backend, database, `.env` files, or the parent Sites configuration.

1. Commit and push the landing-page files and workflow to GitHub.
2. In the `CodeReDarsh/TrainDex` repository, select **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. In **Actions**, open **Deploy TrainDex landing page** and run it on `main` if it has not already succeeded. The initial project URL is `https://coderedarsh.github.io/TrainDex/`.
4. Under **Settings → Pages → Custom domain**, save your actual domain (for example, `yourdomain.com`) before changing its DNS.
5. In Porkbun's domain management, open the domain's DNS records. Add the records below. Porkbun uses an empty Host for the root domain.

| Type | Host | Answer |
|---|---|---|
| A | leave blank | `185.199.108.153` |
| A | leave blank | `185.199.109.153` |
| A | leave blank | `185.199.110.153` |
| A | leave blank | `185.199.111.153` |
| CNAME | `www` | `coderedarsh.github.io` |

Replace conflicting parking/old website records for the root and `www`; retain unrelated mail and verification records. Do not include `https://` or `/TrainDex/` in the CNAME answer. Keep Porkbun's DNS nameservers if they are already authoritative for the domain; registration alone does not mean Porkbun hosts its DNS.

6. Wait for GitHub's DNS check and certificate to complete, then enable **Enforce HTTPS**. DNS/certificate changes may take up to 24 hours. GitHub can redirect `www` to the root domain when both records are configured.

With an Actions publishing source, a `CNAME` file is not required; the custom domain is configured in the repository's Pages settings. GitHub Free supports Pages from public repositories; private repositories require an eligible plan. GitHub Pages serves this static advertisement only; the application's API needs separate server hosting.

The workflow is prepared locally; GitHub Pages and DNS settings have not been changed by this task.

Official instructions: [GitHub custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Porkbun GitHub Pages setup](https://kb.porkbun.com/article/64-how-to-connect-your-domain-to-github-pages), and [Porkbun DNS fields](https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun).
