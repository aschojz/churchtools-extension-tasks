declare module '../scripts/package.js' {
    export function verifyDist(distDir: string): { key: string; assetCount: number };
}
