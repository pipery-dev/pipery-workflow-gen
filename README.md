# Pipery Workflow Generator

Next.js app for generating Pipery CI/CD workflow files.

The wizard starts by asking whether the user wants a build plan for GitHub Actions, GitLab CI, or Bitbucket Pipelines:

- GitHub Actions generates `.github/workflows/<workflow>.yml` and can open a GitHub pull request.
- GitLab CI generates `.gitlab-ci.yml` and can open a GitLab merge request.
- Bitbucket Pipelines generates `bitbucket-pipelines.yml` with Bitbucket Cloud shared pipeline imports.

Repository automation uses the OAuth provider selected during sign-in, so GitHub users see GitHub repositories and GitLab users see GitLab projects. Bitbucket Cloud build plan generation currently supports preview and download.

GitHub sign-in must grant the `workflow` OAuth scope so the app can create pull requests that add files under `.github/workflows`.
Sign-in returns to `/auth/callback?provider=<provider>&next=/wizard` before continuing, so the app can show which provider completed login.

## Environment

```bash
NEXTAUTH_SECRET=replace_with_a_long_random_secret
NEXTAUTH_URL=https://start.pipery.dev
PIPERY_AUTH_SESSION_COOKIE_PREFIX=__Secure-pipery-auth
PIPERY_AUTH_CLIENT_ID=pipery-workflow-gen
PIPERY_AUTH_STATE_SECRET=shared_hmac_secret_matching_auth
PIPERY_AUTH_URL=https://auth.pipery.dev
GITLAB_API_BASE=https://gitlab.com/api/v4
```

`GITLAB_API_BASE` is optional and only needed for self-managed GitLab.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
