import * as core from '@actions/core';
import * as github from '@actions/github';
import * as crypto from 'crypto';

import { getClient } from './api';

interface BranchOptions {
    branchName: string;
    repoOwner?: string;
    repoName?: string;
}

// Función para generar un hash SHA-256 único
const generateUniqueHash = (input: string): string => {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('hex');
};

let branchHash: string;

const createBranch = async (options: BranchOptions): Promise<void> => {
    const { branchName, repoOwner, repoName } = options;
    const owner = repoOwner || github.context.repo.owner;
    const repo = repoName || github.context.repo.repo;

    const headBranchName = 'main';

    try {
        // Usa como referencia la rama 'headBranchName'
        const headBranch = await getClient().repos.getBranch({
            owner,
            repo,
            branch: headBranchName,
        });

        const sha = headBranch.data.commit.sha;
        
        // Generar un hash único basado en el nombre de la rama y un timestamp
        const timestamp = new Date().getTime();
        const inputForHash = `${options.branchName}-${timestamp}`;
        const fullHash = generateUniqueHash(inputForHash);
        const uniqueHash = fullHash.slice(-6);

        branchHash = `${options.branchName}-${uniqueHash}`;

        // Construir la referencia de la nueva rama
        const ref = `refs/heads/${branchHash}`;
        
        // Crear la nueva rama utilizando el SHA obtenido de 'headBranchName'
        await getClient().git.createRef({
            owner,
            repo,
            ref,
            sha,
        });
        
        core.info(`Creating branch ${ref} from ${headBranchName} in repo ${owner}/${repo}...`);
        core.info(`Branch created successfully: ${ref}`);
    } catch (error) {
        const errorMessage = (error as Error).message;
        core.error(`Error creating branch ${options.branchName}: ${errorMessage}`);
        throw error;
    }
};

export {
    createBranch,
    branchHash
};

