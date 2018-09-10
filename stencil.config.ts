import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'annotationscomponent',
  outputTargets:[
    {
      type: 'dist'
    },
    {
      type: 'www',
      serviceWorker: null
    }
  ]
};
