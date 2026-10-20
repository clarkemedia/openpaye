import { SITE } from '../config/site';
import { Icon, Shape } from './ui';

export function Brand({ base = './' }: { base?: string }) {
  return (
    <a class="brand" href={base} aria-label="OpenPAYE home">
      <span class="brand-mark">
        <Shape name="cookie9" class="brand-shape" />
        <Icon name="euro" size={22} class="brand-icon" />
      </span>
      <span class="brand-name">
        Open<b>PAYE</b>
        <span class="brand-tld">.ie</span>
      </span>
    </a>
  );
}

export function DonateButton() {
  if (!SITE.donateUrl) return null;
  return (
    <a class="coffee-chip" href={SITE.donateUrl} target="_blank" rel="noopener" title="OpenPAYE is free with no ads. A coffee helps keep it that way.">
      <span class="state" />
      <Icon name="coffee" size={18} />
      <span class="coffee-label">Buy me a coffee</span>
    </a>
  );
}

const MENU = [
  { href: 'salary/', label: 'Salaries' },
  { href: 'take-home/', label: 'Net to gross' },
  { href: 'budget-2027/', label: 'Budget 2027' },
  { href: 'employer-cost/', label: 'Employer cost' },
  { href: 'guides/', label: 'Guides' },
] as const;

/** The website's main menu. Only on the website build, where these pages exist. */
export function SiteNav({ base = './', current }: { base?: string; current?: string }) {
  return (
    <nav class="site-nav" aria-label="Main">
      {MENU.map((m) => (
        <a href={`${base}${m.href}`} aria-current={current === m.href ? 'page' : undefined}>
          {m.label}
        </a>
      ))}
    </nav>
  );
}

const POPULAR = [25000, 30000, 35000, 40000, 45000, 50000, 60000, 70000, 80000, 100000];

export function SiteFooter({ base = './' }: { base?: string }) {
  const k = (n: number) => `€${n / 1000}k`;
  return (
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-about">
          <span class="brand-name small">
            Open<b>PAYE</b>
            <span class="brand-tld">.ie</span>
          </span>
          <p>
            A free, open-source salary calculator for the people of Ireland. Estimates only: your payslip depends on your Revenue tax credit
            certificate. Not affiliated with Revenue or the Government of Ireland.
          </p>
          <p class="footer-version">Version {SITE.version.replace(/\.0$/, '')}</p>
          {SITE.donateUrl && (
            <a class="footer-support" href={SITE.donateUrl} target="_blank" rel="noopener">
              <Icon name="coffee" size={18} /> Buy me a coffee to keep it free
            </a>
          )}
        </div>
        <nav class="footer-cols" aria-label="Site">
          <div>
            <h2>Calculators</h2>
            <a href={base}>Salary after tax</a>
            {SITE.pages && <a href={`${base}take-home/`}>Net to gross</a>}
            {SITE.pages && <a href={`${base}hourly/`}>Hourly wage</a>}
            <a href={`${base}employer-cost/`}>Employer cost</a>
          </div>
          {SITE.pages && (
            <div>
              <h2>Popular salaries</h2>
              {POPULAR.map((n) => (
                <a href={`${base}salary/${n}/`}>{k(n)} after tax</a>
              ))}
            </div>
          )}
          {SITE.pages && (
            <div>
              <h2>Guides</h2>
              <a href={`${base}budget-2027/`}>Budget 2027</a>
              <a href={`${base}guides/tax-bands/`}>Income tax bands</a>
              <a href={`${base}guides/usc/`}>USC rates</a>
              <a href={`${base}guides/prsi/`}>PRSI rates</a>
              <a href={`${base}guides/tax-credits/`}>Tax credits</a>
              <a href={`${base}guides/auto-enrolment/`}>Auto-enrolment</a>
              <a href={`${base}guides/minimum-wage/`}>Minimum wage</a>
            </div>
          )}
          <div>
            <h2>OpenPAYE</h2>
            {SITE.pages && <a href={`${base}widget/`}>Widget</a>}
            {SITE.repoUrl && (
              <a href={SITE.repoUrl} target="_blank" rel="noopener">
                Source code <Icon name="open_in_new" size={14} />
              </a>
            )}
            <a href="https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/tax-relief-charts/index.aspx" target="_blank" rel="noopener">
              Revenue rates <Icon name="open_in_new" size={14} />
            </a>
            <a href="https://www.gov.ie/en/department-of-finance/" target="_blank" rel="noopener">
              Budget documents <Icon name="open_in_new" size={14} />
            </a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
