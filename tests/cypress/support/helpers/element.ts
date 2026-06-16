export function element(dataTest: string, ...nested: string[]): string {
  return [`[data-test="${dataTest}"]`, ...nested].join(' ');
}

export function elementStartsWith(prefix: string): string {
  return `[data-test^="${prefix}"]`;
}

export function elementEndsWith(suffix: string): string {
  return `[data-test$="${suffix}"]`;
}
