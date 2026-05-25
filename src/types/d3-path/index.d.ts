declare module "d3-path" {
  export interface Path {
    moveTo(x: number, y: number): void;
    closePath(): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    bezierCurveTo(
      cpx1: number,
      cpy1: number,
      cpx2: number,
      cpy2: number,
      x: number,
      y: number,
    ): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void;
    arc(
      x: number,
      y: number,
      r: number,
      a0: number,
      a1: number,
      ccw?: boolean,
    ): void;
    rect(x: number, y: number, w: number, h: number): void;
    toString(): string;
  }

  export function path(): Path;
}
