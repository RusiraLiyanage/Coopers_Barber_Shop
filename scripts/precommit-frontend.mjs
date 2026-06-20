import { spawnSync } from 'node:child_process';

const FRONTEND_APPS = [
  {
    name: 'admin frontend',
    path: 'Frontend/admin-frontend',
  },
  {
    name: 'customer frontend',
    path: 'Frontend/appointment-booking-frontend',
  },
];

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getStagedFiles() {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    {
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? 'Unable to read staged files.\n');
    process.exit(result.status ?? 1);
  }

  return result.stdout
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean);
}

const stagedFiles = getStagedFiles();
const shouldCheckAllFrontends = stagedFiles.some((file) =>
  [
    'package.json',
    'scripts/precommit-frontend.mjs',
    '.husky/pre-commit',
  ].includes(file),
);
const appsToCheck = FRONTEND_APPS.filter(
  (app) =>
    shouldCheckAllFrontends ||
    stagedFiles.some((file) => file.startsWith(`${app.path}/`)),
);

if (appsToCheck.length === 0) {
  console.log('No staged frontend changes detected. Skipping frontend checks.');
  process.exit(0);
}

for (const app of appsToCheck) {
  console.log(`Running ESLint for ${app.name}...`);
  run('pnpm', ['--dir', app.path, 'lint']);

  console.log(`Running TypeScript/Vite build for ${app.name}...`);
  run('pnpm', ['--dir', app.path, 'build']);
}
