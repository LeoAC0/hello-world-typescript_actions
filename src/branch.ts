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

    const headBranchName = 'main';

    try {
        // Crear rama a partir de 'headBranchName'
        const headBranch = await getClient().repos.getBranch({
            owner,
            repo,
            branch: headBranchName,
        });

        const sha = headBranch.data.commit.sha;

        // Construir la referencia de la nueva rama
        const ref = `refs/heads/${options.branchName}`;

        core.info(`Creating branch ${ref} from ${headBranchName} in repo ${owner}/${repo}...`);

        // Crear la nueva rama utilizando el SHA obtenido de 'headBranchName'
        await getClient().git.createRef({
            owner,
            repo,
            ref,
            sha,
        });

        core.info(`Branch created successfully: ${ref}`);
    } catch (error) {
        const errorMessage = (error as Error).message;
        core.error(`Error creating branch ${options.branchName}: ${errorMessage}`);
        throw error;
    }
};

export {
    createBranch
};

