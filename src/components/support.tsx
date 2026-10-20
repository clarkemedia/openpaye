import { SITE } from '../config/site';
import { Button, Icon } from './ui';

/** "Buy me a coffee" card. Hidden unless VITE_DONATE_URL is set. */
export function SupportCard() {
  if (!SITE.donateUrl) return null;
  return (
    <section class="card support-card" aria-labelledby="support-h">
      <div class="support-art" aria-hidden="true">
        <Icon name="coffee" size={32} />
      </div>
      <div class="support-text">
        <h2 id="support-h" class="card-title">Keeping OpenPAYE free</h2>
        <p>
          No ads, no tracking, no sign-up. This is a passion project! However, hosting and upkeep cost money, so if this helped you, please consider buying me
          a coffee :)
        </p>
      </div>
      <div class="support-actions">
        <Button variant="filled" icon="coffee" href={SITE.donateUrl}>
          Buy me a coffee
        </Button>
      </div>
    </section>
  );
}

export const NAV = [
  { href: 'salary/', label: 'Salaries', icon: 'payments' },
  { href: 'take-home/', label: 'Net to gross', icon: 'swap_horiz' },
  { href: 'budget-2027/', label: 'Budget 2027', icon: 'account_balance' },
  { href: 'employer-cost/', label: 'Employer cost', icon: 'business_center' },
  { href: 'guides/', label: 'Tax guides', icon: 'receipt_long' },
  { href: 'widget/', label: 'Widget', icon: 'widgets' },
] as const;

/** Links to the website's extra pages (only on the website build). */
export function ExploreChips({ base = './' }: { base?: string }) {
  const links = SITE.pages ? NAV : NAV.filter((n) => n.href === 'employer-cost/');
  return (
    <nav class="explore" aria-label="Explore">
      {links.map((n) => (
        <a class="chip" href={`${base}${n.href}`}>
          <Icon name={n.icon} size={18} />
          {n.label}
        </a>
      ))}
    </nav>
  );
}
