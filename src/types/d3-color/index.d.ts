declare module "d3-color" {
  export interface Color {
    opacity: number;
    brighter(k?: number): Color;
    darker(k?: number): Color;
    formatHex(): string;
    formatHex8(): string;
    formatHsl(): string;
    formatRgb(): string;
    toString(): string;
  }

  export function color(specifier: string): Color | null;
  export function rgb(r: number, g: number, b: number, opacity?: number): Color;
  export function hsl(h: number, s: number, l: number, opacity?: number): Color;
}
