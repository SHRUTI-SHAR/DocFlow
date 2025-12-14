/**
 * Utility functions for template processing
 */

export const isPlainObject = (val: any): boolean => (
  val !== null && typeof val === 'object' && !Array.isArray(val) && Object.prototype.toString.call(val) === '[object Object]'
);

export const arrayOfObjectsWithSameKeys = (arr: any[]): boolean => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  if (!arr.every(item => isPlainObject(item))) return false;
  const keys = Object.keys(arr[0]).sort().join('|');
  return arr.every(item => Object.keys(item).sort().join('|') === keys);
};

export const formatFieldName = (name: string): string => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
};

