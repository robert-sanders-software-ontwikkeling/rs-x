import * as path from 'path';
import * as webpack from 'webpack';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
   entry: './rs-x-core-ui/lib/index.ts',
   mode: 'none',
   output: {
      path: path.resolve(__dirname, 'dist/build'),
      chunkFilename: '[name].js',
      filename: '[name].js',
   },
   devtool: 'source-map',
   resolve: {
      extensions: ['.ts', '.js'],
      plugins: [new TsconfigPathsPlugin()],
   },
   module: {
      rules: [
         {
            test: /\.ts$/,
            loader: 'esbuild-loader',
            options: {
               loader: 'ts',
               target: 'es2024', 
            },
         },
         {
            test: /\.scss$/,
            use: 'sass-loader',
         },
         {
            test: /\.html$/i,
            loader: 'html-loader',
         },
      ],
   },
};

export default config;
