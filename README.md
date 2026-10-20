# OpenPAYE

**What you actually take home.** OpenPAYE is an open-source salary after tax calculator for Ireland. It covers Income Tax, USC and PRSI for **2025**, **2026** and **Budget 2027**, and shows every step of the maths.

- **Private:** nothing you type is collected. Everything runs in your browser, with no cookies, no analytics, no trackers and no third-party requests. The included nginx config also turns off visitor logs.
- **Self-hostable:** it builds to static files. Run it with Docker, on any web host, or as a single HTML file that works offline.
- **Material 3 Expressive design:** dynamic colour, Google Sans Flex, spring motion and shape morphing. It follows your device's light or dark setting, or you can choose one.

## Branches

| Branch | What it's for |
|---|---|
| `source` | **All the code.** Work and pull requests go here. |
| `self-host` | **Built self-hosted version**, made automatically from `source` and served by GitHub Pages. The calculator, the employer cost calculator and the embeddable widget. |
| `site` | **Built website** for openpaye.ie, made automatically from `source`. Everything in `self-host`, plus about 660 pre-rendered search-friendly pages (every salary, hourly rate and net-to-gross amount, Budget 2027 and tax guides), a sitemap, canonical URLs and structured data. |

Only edit `source`. The other two branches are rebuilt on every push, so changes made there are lost.

## Features

| | |
|---|---|
| **Tax years** | 2025, 2026 and 2027 (Budget 2027, announced 6 October 2026) |
| **Pay periods** | Year, month, fortnight, week, day and hour, with a custom work schedule |
| **Reverse mode** | Enter your take-home pay to find the gross salary |
| **Household** | Single, single parent, widowed, married with one income (Home Carer credit) or two incomes. For two incomes, your partner gets their own salary, bonus, pension, AVCs and benefits, and you can switch the headline between You, Spouse and Household |
| **Pension** | Percentage or fixed contributions plus AVCs, sharing the age-based relief limit and the €115k earnings cap, with an option to cap at the limit. Auto-enrolment (My Future Fund) from 2026 |
| **Bonus planner** | Overtime and bonus, a slider to pay part of the bonus into your pension, a cash vs pension comparison, and an option to keep a lump-sum bonus out of your monthly figure |
| **Company shares** | ESPP, Approved Profit Sharing Scheme (APSS) and RSUs with sell-to-cover |
| **Benefits-in-kind** | Health insurance with medical insurance relief, company cars (A1 to E, business kilometres, OMV reductions), employer loans and other benefits |
| **Credits and reliefs** | Rent Tax Credit, Mortgage Interest Tax Credit (2025–26), flat rate expenses, TaxSaver commuter tickets, remote working relief, Blind Person, Dependent Relative, Incapacitated Child, Age credit and the 65+ exemption, reduced USC (70+ or medical card), and credits from your certificate |
| **Public sector** | Additional Superannuation Contribution (pre-2013, fast accrual and Single Scheme) and PRSI Class D |
| **Other income** | Self-employed profit (Class S PRSI, Earned Income credit, USC surcharge), rental income, rent-a-room relief, investment income and the State pension |
| **Payslip mode** | Uses the PRSI rate in force now instead of the yearly average |
| **Insights** | What each Budget did to your tax, your next €100, tax freedom day, how you compare, take-home at every salary, pay-rise and pension what-ifs, bonus planner, shares, auto-enrolment and household |
| **Transparency** | "Show me the maths" lists every band, credit and rate |
| **Employer cost** | Employer PRSI, auto-enrolment matching and pension, at `/employer-cost/` |
| **Sharing** | Your inputs live in the URL, so a link opens the exact calculation |

See [CHANGELOG.md](CHANGELOG.md) for what's new.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer (the LTS version is fine).

**macOS and Linux**

```bash
npm install
npm run build && npm run preview   # http://localhost:4173
```

**Windows (PowerShell)**

```powershell
npm install
npm run build; npm run preview     # http://localhost:4173
```

Other commands:

```bash
npm run dev           # development server with hot reload: http://localhost:5173
npm test              # tax engine tests (hand-worked examples)
npm run build:single  # calculator only, as one self-contained file: dist-single/index.html
npm run build:site    # the full website with the search pages (settings in .env.site)
```

## Self-host

**Docker**

```bash
docker compose up -d   # http://localhost:8080
```

The image runs the tests, builds the app and serves it with nginx. It uses a strict Content Security Policy and makes no external requests.

**GitHub Pages.** Every push to `source` builds the app and publishes it to the `self-host` branch (see `.github/workflows/pages.yml`). In a fork, turn it on under **Settings → Pages → Deploy from a branch → `self-host` / root**. The live copy is at https://clarkemedia.github.io/openpaye/.

**Any static host.** Upload `dist/` to Netlify, Cloudflare Pages, GitHub Pages, S3 or a plain web server. If your host sets a CSP, allow `/embed.html` to be framed by other sites (`frame-ancestors *`), as `nginx.conf` does. On Apache hosts (Cloudways, cPanel and most shared hosting), copy [`deploy/apache/.htaccess`](deploy/apache/.htaccess) next to `index.html` for the same rules.

**Pull from Git.** Hosts that deploy from a Git branch without building (such as Cloudways) can pull the `self-host` or `site` branch, which already contain the finished files.

**IndexNow.** After the web host has pulled a new `site` build, run **Actions → Submit to IndexNow → Run workflow** to tell Bing and other IndexNow search engines about every page. It checks the live site is up to date first. The key is `VITE_INDEXNOW_KEY` in `.env.site`.

**No server at all.** Run `npm run build:single`, then open or share `dist-single/index.html`. It works offline.

### Optional settings

Copy `.env.example` to `.env`, or pass these as Docker build arguments:

| Setting | Effect |
|---|---|
| `VITE_SITE_URL` | Your site's address (used for canonical links in the website build) |
| `VITE_REPO_URL` | Shows a "Source code" link in the footer |
| `VITE_DONATE_URL` | Shows a "Buy me a coffee" link (PayPal.me, Ko-fi, GitHub Sponsors…) |

## Widget

Show take-home pay next to any salary on another website:

```html
<script src="https://your-host/widget.js" defer></script>
<span data-openpaye-net="45000"></span>                  <!-- ≈ €3,084/month take-home -->
<span data-openpaye-net="40000-50000"></span>            <!-- ranges work -->
<div data-openpaye-calculator data-salary="45000"></div>   <!-- full calculator in an auto-sized iframe -->
```

`widget.js` is a 13 KB standalone script with no dependencies (`src/widget/widget.ts`). Options: `data-period`, `data-show`, `data-year`, `data-status`, `data-format`, `data-theme`, `data-seed`, `data-attribution="0"`.

A JSON API version runs as a Cloudflare Worker; see [`api/`](api/README.md).

## Updating rates for a new Budget

All rates live in [`src/tax/years.ts`](src/tax/years.ts), with one object per year covering bands, credits, USC bands, employee and employer PRSI, pension limits and auto-enrolment.

1. Copy the previous year's object.
2. Change what the Budget changed.
3. Add the year to `YEARS` and `YEAR_LIST`.
4. Add a hand-worked example to `src/tax/engine.test.ts`.

The engine ([`src/tax/engine.ts`](src/tax/engine.ts)) is plain TypeScript with no UI code, so you can reuse it anywhere.

## How the calculation works

1. **Gross** = salary + overtime + bonus. Benefit-in-kind is added for tax purposes.
2. **Pension relief** is deducted for Income Tax only, up to the age-based limit.
3. **Income Tax** is 20% up to your standard rate cut-off and 40% above it, less non-refundable credits.
4. **USC** is charged on total income, band by band. Income of €13,000 or less is exempt. Medical card holders and people aged 70+ earning €60,000 or less pay reduced rates.
5. **PRSI (Class A)** applies to all income once you earn over €352 a week, with the tapered PRSI credit up to €424. The January–September and October–December rates are applied pro rata.
6. **Take-home** = gross − Income Tax − USC − PRSI − pension − auto-enrolment.

These are annual estimates. Your payslip depends on your Revenue tax credit certificate, cumulative PAYE, and when in the year you started.

## Sources

- Revenue: [tax credits and rate bands](https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/tax-relief-charts/index.aspx), [USC](https://www.revenue.ie/en/jobs-and-pensions/usc/index.aspx)
- Department of Finance: Budget 2025, 2026 and 2027
- Department of Social Protection: PRSI rates
- CSO: Earnings Analysis using Administrative Data Sources (median and mean earnings)

Budget 2027 figures are as announced and become law when the Finance Act 2026 passes. If a figure changes, update `years.ts` and send a pull request.

## Contributing

Issues and pull requests are welcome, especially rate corrections with a link to the source.

## Support

OpenPAYE is free and has no ads. If it helped you, you can [buy me a coffee](https://www.paypal.com/paypalme/eoinmcm) to help keep it that way.

## Licence

[MIT](LICENSE). Not affiliated with Revenue or the Government of Ireland.
