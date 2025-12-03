# GitHub Actions Migration Guide

## Problem

Your Coveralls coverage stopped updating because **Travis CI ended their free tier** for open source projects in late 2020/early 2021.

## Solution

I've created a GitHub Actions workflow that will:
- ✅ Run tests on Node.js 20.x and 22.x
- ✅ Test against MongoDB versions 4.4, 5.0, 6.0, and 7.0
- ✅ Run ESLint
- ✅ Generate coverage reports
- ✅ Automatically upload to Coveralls.io

## Files Created

### `.github/workflows/ci.yml`
This is your new CI pipeline. It replaces `.travis.yml`.

## Next Steps

### 1. Commit and Push
```bash
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI workflow with Coveralls integration"
git push
```

### 2. Verify on GitHub
- Go to: https://github.com/seppevs/migrate-mongo/actions
- You should see the workflow running automatically

### 3. Check Coveralls
- After the workflow completes, visit: https://coveralls.io/github/seppevs/migrate-mongo
- Coverage should be updated!

### 4. Optional: Remove Travis CI
Once you confirm GitHub Actions is working:
```bash
git rm .travis.yml
git commit -m "Remove deprecated Travis CI configuration"
git push
```

You can also remove the coveralls package from devDependencies since GitHub Actions uses a dedicated action:
```bash
npm uninstall coveralls
git add package.json package-lock.json
git commit -m "Remove coveralls CLI (GitHub Action handles uploads)"
git push
```

## Benefits of GitHub Actions

1. **Free for public repos** - No more Travis CI payment issues
2. **Better integration** - Native GitHub support
3. **Faster builds** - Parallel testing across Node/MongoDB versions
4. **More flexible** - Easy to add new checks or deployments
5. **Modern** - Actively maintained and improved

## Troubleshooting

**No workflows appearing?**
- Check that GitHub Actions are enabled in your repo settings

**Coverage not updating?**
- Verify the repo is linked in Coveralls.io
- Check the Actions logs for any errors
- Ensure the repo is public

**Want to test locally first?**
```bash
npm test  # Runs tests with coverage
# Coverage report is in coverage/lcov-report/index.html
```

## The Workflow Explained

```yaml
# Runs on every push to main/master and on pull requests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

# Tests in a matrix:
# - Node.js: 20.x, 22.x
# - MongoDB: 4.4, 5.0, 6.0, 7.0
# Total: 8 parallel jobs for comprehensive testing

# After all tests pass, coverage is uploaded to Coveralls
```

This ensures your package works across all supported Node.js and MongoDB versions!
