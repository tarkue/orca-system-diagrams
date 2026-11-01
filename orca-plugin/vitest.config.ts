import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['orca-plugin/**/*.test.ts'],environment:'node'}});
