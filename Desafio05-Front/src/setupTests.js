import { expect as vitestExpect } from 'vitest';
// Ensure `expect` is available to @testing-library/jest-dom which expects a global `expect`
globalThis.expect = vitestExpect;
import '@testing-library/jest-dom';
