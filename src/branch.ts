import * as core from '@actions/core';
import * as github from '@actions/github';

import { getClient } from './api';

interface BranchOptions {
    branchName: string;
    repoOwner?: string;
    repoName?: string;
}

const createBranch = async (options: BranchOptions): Promise<void> => {
    const { branchName, repoOwner, repoName } = options;
    const owner = repoOwner || github.context.repo.owner;
    const repo = repoName || github.context.repo.repo;

    const mainBranchName = 'main';

    // Obtener el SHA del commit más reciente de la rama 'main'
    const mainBranchRef = `refs/heads/${mainBranchName}`;
    const mainBranch = await getClient().git.getRef({
        owner,
        repo,
        ref: mainBranchRef,
    });
    const sha = mainBranch.data.object.sha;

    // Construir la referencia de la nueva rama
    const ref = `refs/heads/${options.branchName}`;

    core.info(`Creating branch ${ref} in repo ${owner}/${repo}...`);

    try {
        // Crear la nueva rama utilizando el SHA obtenido de 'main'
        await getClient().git.createRef({
            owner,
            repo,
            ref,
            sha,
        });

        core.info(`Branch created successfully: ${ref}`);
    } catch (error) {
        const errorMessage = (error as Error).message;
        core.error(`Error creating branch ${ref}: ${errorMessage}`);
        throw error;
    }
};

export {
    createBranch
};
