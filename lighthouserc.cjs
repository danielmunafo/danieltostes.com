/** @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md */
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./out",
      url: ["http://localhost/en.html"],
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox --headless --disable-gpu",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.8 }],
        "categories:best-practices": ["error", { minScore: 0.8 }],
        "categories:seo": ["error", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
