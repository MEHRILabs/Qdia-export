import { config } from "dotenv";
import { envFilePath } from "./lib/runtime-paths";

config({ path: envFilePath(), override: true });
