import * as core from '@actions/core';
import * as github from '@actions/github';

import { initClient, getClient } from './api';

interface BranchOptions {
    branchName: string;
    repoOwner?: string;
    repoName?: string;
}

const createBranch = async (options: BranchOptions): Promise<void> => {
    const { branchName, repoOwner, repoName } = options;
    const owner = repoOwner || github.context.repo.owner;
    const repo = repoName || github.context.repo.repo;

    // Init REST API Client with auth token
    initClient();

    const ref = `refs/heads/${branchName}`;

    core.info(`Creating branch ${ref} in repo ${owner}/${repo}...`);

    try {
        await getClient().git.createRef({
            owner,
            repo,
            ref,
            sha: 'main' // Cambiar segun la rama a usar
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
