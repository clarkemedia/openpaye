# Changelog

## 1.1 (October 2026)

Built from beta feedback on Reddit. Thanks to everyone who tried it and told us what was missing.

### New
- **Full household mode.** Your spouse or partner gets their own salary, bonus, pension, AVCs, benefits-in-kind, age, medical card and auto-enrolment. Switch the headline between You, Spouse and Household.
- **Company shares.** ESPP (contributions from net pay, discount taxed as pay), bonus taken as shares through an APSS (no Income Tax up to €12,700, USC and PRSI still apply), and RSUs with sell-to-cover.
- **Bonus planner.** Slide how much of your bonus goes into your pension, compare cash against pension side by side, and keep a lump-sum bonus out of your regular monthly figure.
- **AVCs** as their own setting, sharing the age-based relief limit with your main pension.
- **Payslip mode.** Uses the PRSI rate on your payslip right now instead of the yearly average, so October to December figures match.
- **Flat rate expenses** and **remote working relief** (30% of electricity, heating and broadband for days at home).
- **More credits:** Blind Person, Dependent Relative, and widowed status.
- **Public sector:** Additional Superannuation Contribution for pre-2013, fast accrual and Single Scheme members, and PRSI Class D for staff who joined before 6 April 1995.
- **Other income:** self-employed profit (Class S PRSI, Earned Income credit, 3% USC surcharge over €100,000), rental income, rent-a-room relief, investment income and the State pension.
- **Benefits-in-kind:** company cars (2025 to 2027 rules, including the A1 electric category and OMV reductions), cheap loans from your employer, and other taxable benefits.
- **Floating mini calculator** that follows you down the page, with a quick salary editor.

### Changed
- The pension section now shows clearly when contributions go over the tax relief limit, with an option to cap them.
- The coffee link moved to a small button in the header.
- Employer cost counts pension contributions as money going to the employee, and allows employer contributions up to 100%.
- Button groups are a single rounded track with one selected pill.

### Rates
- New figures come from Revenue, the Department of Social Protection's 2026 PRSI guide, Citizens Information and Budget 2027. Where a figure is derived rather than published (PRSI Class D for 2025 and from October 2027, and the 2025 electric car reduction), the code says so in `src/tax/years.ts`.

## 1.0 (October 2026)

First release: Income Tax, USC and PRSI for 2025, 2026 and Budget 2027.
