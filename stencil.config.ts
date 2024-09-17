import { Config } from '@stencil/core';
import nodePolyfills from 'rollup-plugin-node-polyfills';

export const config: Config = {
  namespace: 'mgexplorer',
  globalStyle: './src/mgexplorer/index.css',
  srcDir: './src/mgexplorer',
  commonjs: {
    namedExports: {
      './src/lib/mge-mappers': ['mge-mappers'],
      './src/scripts/query-helper': ['query-helper']
    }
  },
  enableCache: false,
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
      copy: [
        {
          src: 'assets',
          dest: 'assets',
          warn: true,
        }
      ]
    },
    {
      type: 'dist-custom-elements-bundle',
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      baseUrl: 'http://localhost:8040',
      copy: [
        {
          src: 'assets',
          dest: 'build/assets',
          warn: true,
        }
      ]
    }
  ],
  rollupPlugins: {
    after: [
      nodePolyfills(),
    ]
  },
  extras: {
    cloneNodeFix: true
  }
};
