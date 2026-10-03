import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyDist } from '../scripts/package.js';

const temporaryDirectories: string[] = [];
afterEach(() => temporaryDirectories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true })));

const buildFixture = () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-package-'));
    temporaryDirectories.push(directory);
    fs.mkdirSync(path.join(directory, 'assets'));
    fs.writeFileSync(path.join(directory, 'assets/app.js'), '');
    fs.writeFileSync(path.join(directory, 'assets/app.css'), '');
    fs.writeFileSync(
        path.join(directory, 'index.html'),
        '<script src="/ccm/tasks/assets/app.js"></script><link href="/ccm/tasks/assets/app.css">',
    );
    return directory;
};

describe('CCM package validation', () => {
    it('accepts one consistent extension base with existing assets', () => {
        expect(verifyDist(buildFixture())).toEqual({ key: 'tasks', assetCount: 2 });
    });

    it('rejects stale asset references before creating an archive', () => {
        const directory = buildFixture();
        fs.writeFileSync(path.join(directory, 'index.html'), '<script src="/ccm/tasks/assets/missing.js"></script>');
        expect(() => verifyDist(directory)).toThrow('Build-Asset fehlt');
    });
});
