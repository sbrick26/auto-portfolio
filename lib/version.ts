// Single source of truth for the site version: package.json.
// Minor bumps ship automatically with every pipeline drop.
// Major bumps are milestone releases done together with the owner.
import pkg from "../package.json";

export const APP_VERSION: string = pkg.version;

// intentional break for the fix-loop drill
export const broken: number = "this is not a number";
