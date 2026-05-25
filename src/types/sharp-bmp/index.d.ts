import "sharp";

declare module "sharp" {
  interface Sharp {
    bmp(options?: Record<string, unknown>): Sharp;
  }
}
