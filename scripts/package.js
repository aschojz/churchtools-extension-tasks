#!/usr/bin/env node

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function verifyDist(distDir) {
    const indexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexPath)) throw new Error('dist/index.html fehlt.');
    const html = fs.readFileSync(indexPath, 'utf8');
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
    const extensionUrls = urls.filter(url => url.startsWith('/ccm/'));
    if (!extensionUrls.length) throw new Error('index.html enthält keine /ccm/<key>/ Asset-Pfade.');
    const keys = new Set(extensionUrls.map(url => url.split('/')[2]).filter(Boolean));
    if (keys.size !== 1) throw new Error('index.html verwendet mehrere Extension-Keys.');
    const key = [...keys][0];
    for (const url of extensionUrls) {
        const prefix = `/ccm/${key}/`;
        const relativePath = decodeURIComponent(url.slice(prefix.length));
        if (!relativePath || relativePath.includes('..') || !fs.existsSync(path.join(distDir, relativePath)))
            throw new Error(`Referenziertes Build-Asset fehlt: ${url}`);
    }
    const files = fs.readdirSync(path.join(distDir, 'assets'));
    if (!files.some(file => file.endsWith('.js')) || !files.some(file => file.endsWith('.css')))
        throw new Error('Der Build benötigt mindestens ein JavaScript- und ein CSS-Asset.');
    return { key, assetCount: files.length };
}

function packageExtension() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const distDir = path.join(rootDir, 'dist');
    if (!fs.existsSync(distDir)) throw new Error('dist fehlt. Zuerst npm run build ausführen.');
    const verified = verifyDist(distDir);
    if (process.argv.includes('--verify-only')) {
        console.log(`✅ Build für /ccm/${verified.key}/ geprüft (${verified.assetCount} Assets).`);
        return;
    }

    let gitHash;
    try {
        gitHash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim();
        if (execFileSync('git', ['status', '--porcelain'], { cwd: rootDir, encoding: 'utf8' }).trim())
            gitHash += '-dirty';
    } catch {
        console.warn('Warning: Could not get git hash, using timestamp');
        gitHash = Date.now().toString(36);
    }

    const releasesDir = path.join(rootDir, 'releases');
    fs.mkdirSync(releasesDir, { recursive: true });
    const archiveName = `${packageJson.name}-v${packageJson.version}-${gitHash}.zip`;
    const archivePath = path.join(releasesDir, archiveName);
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);

    console.log('📦 Creating ChurchTools extension package...');
    console.log(`   Extension route: /ccm/${verified.key}/`);
    console.log(`   Archive: ${archiveName}`);
    execFileSync('zip', ['-r', archivePath, 'dist/', '-x', '*.map', '*.DS_Store'], {
        cwd: rootDir,
        stdio: 'inherit',
    });
    const entries = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' }).trim().split('\n');
    if (!entries.includes('dist/index.html') || entries.some(entry => !entry.startsWith('dist/')))
        throw new Error(
            'Das Archiv entspricht nicht dem ChurchTools-Format: dist/ muss der einzige Wurzelordner sein.',
        );

    const fileSizeInMB = (fs.statSync(archivePath).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Package geprüft: ${archivePath} (${fileSizeInMB} MB)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        packageExtension();
    } catch (error) {
        console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    }
}
