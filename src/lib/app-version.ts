import packageJson from "../../package.json";

export const appVersion = packageJson.version.split(".").slice(0, 2).join(".");
