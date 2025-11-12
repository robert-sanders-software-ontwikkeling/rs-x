import * as path from 'path';
import * as webpack from 'webpack';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
   entry: './rs-x-core/lib/index.ts',
   output: {
      path: path.resolve(__dirname, 'dist/build'),
      chunkFilename: '[name].js',
      filename: '[name].js',
   },
   devtool: 'source-map',
   resolve: { extensions: ['.ts', '.js'] },
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
      ],
   },
};

export default config;
