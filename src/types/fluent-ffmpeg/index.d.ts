import "fluent-ffmpeg";

declare module "fluent-ffmpeg" {
  interface FfmpegCommand {
    (input?: string): FfmpegCommand;
    [key: string]: any;
  }
}
