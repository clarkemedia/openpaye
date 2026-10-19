# OpenPAYE API (Cloudflare Worker)

The API is the same tax engine as the website, served as JSON.

```bash
cd api
npx wrangler dev        # http://localhost:8787/v1/calculate?salary=45000
npx wrangler deploy
```

Cloudflare's free Workers tier is plenty for most sites. The API has no keys and no tracking.
