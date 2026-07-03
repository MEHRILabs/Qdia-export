import "./load-env.js";
import { validateSecurityEnv } from "./lib/env-security.js";
import app from "./app.js";
import serverless from "serverless-http";

validateSecurityEnv();

export default serverless(app);
