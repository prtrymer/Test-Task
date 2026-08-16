# Deployment

Two Vercel projects from one repository: the Next.js frontend and the NestJS
API. Postgres and blob storage are provisioned through Vercel and attached to
the API project.

## Before you start

Both projects need to know the other's URL, which creates a chicken-and-egg
problem on a first deploy. Vercel derives a project's production URL from its
name, so decide both names up front and the environment variables can be set
before either deploy runs:

| Project        | Root directory | Production URL                   |
| -------------- | -------------- | -------------------------------- |
| `data-room-web` | `apps/web`     | `https://data-room-web.vercel.app` |
| `data-room-api` | `apps/api`     | `https://data-room-api.vercel.app` |

If those names are taken, substitute your own and adjust the variables below.

## 1. Push the repository

```bash
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

## 2. API project

Import the repository, then set **Root Directory** to `apps/api`. Leave the
framework preset as *Other* — `apps/api/vercel.json` supplies the build command,
the region and the routing.

### Attach storage

From each resource's **Projects** tab, connect it to this project:

- `prisma-postgres-fulvous-envelope`
- `acme-corp-blob`

Connecting the blob store injects `BLOB_READ_WRITE_TOKEN`. Connecting Postgres
injects `DATABASE_URL` — **but not the value this app needs**, see below.

### Environment variables

| Variable                | Value                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`          | pooled host, `pooled.db.prisma.io`, plus `?sslmode=require&connection_limit=5&pool_timeout=15` |
| `DIRECT_URL`            | direct host, `db.prisma.io`, plus `?sslmode=require`                   |
| `JWT_SECRET`            | a fresh 32-byte secret — not the local one                             |
| `CORS_ORIGIN`           | `https://data-room-web.vercel.app`                                     |
| `BLOB_READ_WRITE_TOKEN` | injected automatically when the blob store is connected                |

Two things the integration will not do for you:

**`DATABASE_URL` must be overridden.** The Marketplace integration injects the
*direct* connection string under every variable name it sets. Prisma Postgres
serves the pooled connection from `pooled.db.prisma.io` and the direct one from
`db.prisma.io`; the credentials are identical and only the hostname differs, so
the pooled value is the injected string with the hostname swapped. Running the
app on the direct connection exhausts Postgres under concurrency.

**`DIRECT_URL` must be added.** The build runs `prisma migrate deploy`, and
migrations have to bypass the pooler. Without this the build fails.

`connection_limit=5` is deliberate. Prisma defaults to `cpus * 2 + 1`, which is
the wrong shape for serverless: each instance serves roughly one request at a
time, so the default multiplies across concurrent instances until the pool is
exhausted.

## 3. Frontend project

Import the same repository again as a second project, **Root Directory**
`apps/web`. Next.js is detected automatically.

| Variable              | Value                                |
| --------------------- | ------------------------------------ |
| `NEXT_PUBLIC_API_URL` | `https://data-room-api.vercel.app`   |

## 4. Verify

```bash
# should answer 401 with the standard error envelope, not a platform error page
curl -i https://data-room-api.vercel.app/auth/me
```

Then open the frontend, register an account, create a data room, and upload a
PDF. The upload proves the most fragile path end to end: the browser requests a
ticket from the API, sends the bytes straight to blob storage, and calls back to
commit the row.

## Notes

**Why the function is a shim.** `apps/api/api/index.js` is plain JavaScript that
loads the pre-compiled `dist/`. Vercel bundles function sources with esbuild,
which does not emit the `design:paramtypes` metadata Nest's dependency injection
reads — bundling the decorated TypeScript directly produces a build that
succeeds and then fails to resolve any provider at runtime. `tsc` compiles
everything ahead of time via the `vercel-build` script.

**Cold starts.** The bootstrapped Nest app is cached in module scope, so the
startup cost is paid once per cold start rather than once per request. Measured
locally: 781ms cold, 3ms warm.

**Region.** The API is pinned to `iad1` to match the database. The blob store is
in `fra1`, which does not matter here — bytes never pass through the function,
so the two never talk to each other.

**Regenerating the blob store.** A store's access mode is fixed at creation.
`acme-corp-blob` is private, which is what makes revoking a share meaningful; a
public store would hand out permanently readable URLs.
