/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Keep commit scopes aligned with the main directories (types stay centralized)
    'scope-enum': [
      2,
      'always',
      [
        'app',
        'assets',
        'components',
        'constants',
        'hooks',
        'lib',
        'providers',
        'services',
        'supabase',
        'scripts',
        'types',
        'release',
        'deps',
        'docs',
        'infra'
      ]
    ]
  }
};

