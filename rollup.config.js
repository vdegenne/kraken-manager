import resolve from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript'

export default {
  input: 'kraken-manager.ts',
  output: { file: 'kraken-manager.js', format: 'iife' },
  plugins: [resolve(), typescript()]
}
