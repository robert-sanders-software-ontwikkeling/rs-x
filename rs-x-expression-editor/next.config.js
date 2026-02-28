const isGhPages = process.env.GH_PAGES === 'true';

module.exports = {
  output: 'export',
  basePath: isGhPages ? '/rs-x' : '',
  assetPrefix: isGhPages ? '/rs-x/' : '',
  trailingSlash: true,
};
