import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    suppressDebugErrorLog?: boolean;
  }

  interface InternalAxiosRequestConfig {
    suppressDebugErrorLog?: boolean;
  }
}
