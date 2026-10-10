declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_APP_ENV: "development" | "production";
    NEXT_PUBLIC_API_BASE_URL: string;
  }
}
