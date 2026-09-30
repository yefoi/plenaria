import next from 'eslint-config-next';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'data/**', 'fixtures/**'],
  },
  ...next,
];

export default config;
