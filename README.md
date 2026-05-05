# Pipery Workflow Generator

Next.js app for generating Pipery CI/CD workflow files.

The wizard starts by asking whether the user wants a build plan for GitHub Actions or GitLab CI:

- GitHub Actions generates `.github/workflows/<workflow>.yml` and can open a GitHub pull request.
- GitLab CI generates `.gitlab-ci.yml` and can open a GitLab merge request.

Repository automation uses the OAuth provider selected during sign-in, so GitHub users see GitHub repositories and GitLab users see GitLab projects.

## Environment

```bash
NEXTAUTH_SECRET=replace_with_a_long_random_secret
NEXTAUTH_URL=https://start.pipery.dev
GITLAB_API_BASE=https://gitlab.com/api/v4
```

`GITLAB_API_BASE` is optional and only needed for self-managed GitLab.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
