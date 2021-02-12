/// <reference types="cypress" />

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // require('@cypress/code-coverage/task')(on, config);

  // https://github.com/cypress-io/code-coverage/issues/361
  // const browserify = require('@cypress/browserify-preprocessor');
  //
  // const options = browserify.defaultOptions;
  // // options.browserifyOptions.transform[1][1].babelrc = true;
  // options.browserifyOptions.extensions.push('.ts');
  // options.browserifyOptions.plugin.push('tsify');
  //
  // on(
  //   'file:preprocessor',
  //   browserify({
  //     ...options,
  //   })
  // );
  return config;
};
