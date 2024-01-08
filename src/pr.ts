import * as core from '@actions/core';
import * as github from '@actions/github';

import { getClient } from './api';
import { isDefaultTitle } from './validation';

interface PullsListResponseItem {
    head: { ref: string };
    base: { ref: string };
    number: number;
    html_url: string
}

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
    const base = 'next';
    const headPattern = 'backport'; // Patrón para buscar en el head

    core.info(`Listing open PRs in repo ${owner}/${repo} with "${headPattern}" in head and "${base}" in base...`);

    const parameters = { owner, repo, state, base };
    const response = await getClient().pulls.list(parameters);

    const backportPRs: PullsListResponseItem[] = response.data.filter((pr: PullsListResponseItem) => {
        // Utilizar expresión regular para buscar "backport" en el head
        const regex = new RegExp(headPattern, 'i'); // 'i' para hacer la búsqueda insensible a mayúsculas/minúsculas
        return regex.test(pr.head.ref);
    });

    if (backportPRs.length > 0) {
        core.info(`Found open PRs with "${headPattern}" in branch head and "${base}" in branch base:`);
        
        // Mostrar detalles de cada PR
        backportPRs.forEach((pr: PullsListResponseItem) => {
            core.info(`PR Number: ${pr.number}, Branch Head: ${pr.head.ref}, Branch Base: ${pr.base.ref}`);
        });

    } else {
        core.info(`No open PRs found with "${headPattern}" in head and "${base}" in base.`);
    }

    return backportPRs;
};

export {
    getOpenPR,
    updatePR,
    createPR,
    listOpenBackportPRs,
    PullsListResponseItem
};
