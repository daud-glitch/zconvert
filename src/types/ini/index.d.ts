declare module "ini" {
  export function parse(value: string): any;
  export function stringify(value: Record<string, unknown>): string;
}
