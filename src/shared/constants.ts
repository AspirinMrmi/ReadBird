import type { Category, PersistedData } from './types';

export const STORAGE_KEY = 'readbird:data';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'frontend',
    name: 'Frontend',
    color: '#1d9bf0',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'backend',
    name: 'Backend',
    color: '#7856ff',
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'ai',
    name: 'AI',
    color: '#00ba7c',
    createdAt: new Date(0).toISOString(),
  },
];

export function createEmptyData(): PersistedData {
  return {
    version: 1,
    tweets: [],
    categories: DEFAULT_CATEGORIES,
    settings: {},
  };
}
