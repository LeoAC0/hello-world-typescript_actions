import * as core from '@actions/core';
import * as github from '@actions/github';

import { getClient } from './api';
import { isDefaultTitle } from './validation';

const getOpenPR = async (head: string, base: string, repoOwner = undefined, repoName = undefined) => {
    const owner = repoOwner ? repoOwner : github.context.repo.owner;
    const repo = repoName ? repoName : github.context.repo.repo;
    const state = 'open';

    core.info(`Checking if there is a open PR in repo ${owner}/${repo} from ${head} to ${base}...`);

    const parameters = {owner, repo, head, base, state};
    const response = await getClient().pulls.list(parameters);

    if (response && response.data && response.data.length > 0) {
        const pr = response.data[0];
        core.info(`An active PR was found: # ${pr.number} (${pr.html_url})`);
        return pr;
    }

    core.info(`No active PR was found`);
    return null;
};

const updatePR = async (number: number, title: string, message: string, repoOwner = undefined, repoName = undefined) => {
    const owner = repoOwner ? repoOwner : github.context.repo.owner;
    const repo = repoName ? repoName : github.context.repo.repo;
    const state = 'open';

    core.info(`Updating PR in repo ${owner}/${repo} (PR Number: ${number})...`);

    const parameters: { owner: string; repo: string; pull_number: number; state: string; title?: string; body?: string } = { owner, repo, pull_number: number, state };

    if (!isDefaultTitle() && String(title).trim().length > 0) {
        parameters.title = title;
    }

    if (String(message).trim().length > 0) {
        parameters.body = message;
    }

    const response = await getClient().pulls.update(parameters);

    if (response && response.data) {
        const pr = response.data;
        core.info(`Updated PR: # ${pr.number} (${pr.html_url})`);
        return pr;
    }

    throw new Error(`Error updating PR in repo ${owner}/${repo} (PR Number: ${number})`);
};

const createPR = async (head: string, base: string, title: string, body: string, repoOwner = undefined, repoName = undefined) => {
    const owner = repoOwner ? repoOwner : github.context.repo.owner;
    const repo = repoName ? repoName : github.context.repo.repo;

    core.info(`Creating new PR in repo ${owner}/${repo} from ${head} to ${base}`);

    const parameters = {
        owner,
        repo,
        title,
        head,
        base,
        body
    };
    const response = await getClient().pulls.create(parameters);

    if (response && response.data) {
        const pr = response.data;
        core.info(`Created new PR: # ${pr.number} (${pr.html_url})`);
        return pr;
    }

    throw new Error(`Error creating new PR in repo ${owner}/${repo} from ${head} to ${base}`);
};

const listOpenBackportPRs = async (repoOwner = undefined, repoName = undefined) => {
    const owner = repoOwner ? repoOwner : github.context.repo.owner;
    const repo = repoName ? repoName : github.context.repo.repo;
    const state = 'open';

    core.info(`Listing open PRs in repo ${owner}/${repo} with "backport" in head and "next" in base...`);

    const parameters = { owner, repo, state };
    const response = await getClient().pulls.list(parameters);

    const backportPRs = response.data.filter((pr: { head: { ref: string }, base: { ref: string }, number: number }) => {
        const isBackport = pr.head.ref.toLowerCase().includes('backport');
        console.log(isBackport);
        
        const isNextBase = pr.base.ref === 'next';
        console.log(isNextBase);
        return isBackport && isNextBase;
    });

    if (backportPRs.length > 0) {
        core.info(`Found open PRs with "backport" in head and "next" in base:`);
        for (const pr of backportPRs) {
            core.info(`# ${pr.number} (${pr.html_url})`);

            // Actualizar la rama de la PR
            await updateBranch(pr, 'main');
        };
    } else {
        core.info(`No open PRs found with "backport" in head and "next" in base.`);
    }

    return backportPRs;
};

const updateBranch = async (pr: { head: { ref: string }; number: number }, newBase: string) => {
    console.log("Estoy dentro del update branch");
    
    await getClient().pulls.updateBranch({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: pr.number,
        //base: newBase
    });
};

export {
    getOpenPR,
    updatePR,
    createPR,
    listOpenBackportPRs
};
