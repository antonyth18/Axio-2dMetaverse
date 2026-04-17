import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Path 1: Root of the project (../../../.env)
const rootEnv = path.join(__dirname, "../../../.env");
// Path 2: Local app folder (../../.env from dist or ../.env from src)
const localEnv = path.join(process.cwd(), ".env");

if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
} else {
    dotenv.config({ path: rootEnv });
}