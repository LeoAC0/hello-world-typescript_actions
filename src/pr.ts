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
        core.info(`An active PR was found: # ${pr.number} (${pr.html_url}) (draft: ${pr.draft})`);
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
        core.info(`Updated PR: # ${pr.number} (${pr.html_url}) (draft: ${pr.draft})`);
        return pr;
    }

    throw new Error(`Error updating PR in repo ${owner}/${repo} (PR Number: ${number})`);
};

const createPR = async (head: string, base: string, title: string, body: string, maintainerCanModify: boolean, draft: boolean, repoOwner = undefined, repoName = undefined) => {
    const owner = repoOwner ? repoOwner : github.context.repo.owner;
    const repo = repoName ? repoName : github.context.repo.repo;

    core.info(`Creating new PR in repo ${owner}/${repo} from ${head} to ${base} (draft: ${draft})...`);

    const parameters = {
        owner,
        repo,
        title,
        head,
        base,
        body,
        maintainer_can_modify: maintainerCanModify,
        draft
    };
    const response = await getClient().pulls.create(parameters);

    if (response && response.data) {
        const pr = response.data;
        core.info(`Created new PR: # ${pr.number} (${pr.html_url}) (draft: ${pr.draft})`);
        return pr;
    }

    throw new Error(`Error creating new PR in repo ${owner}/${repo} from ${head} to ${base} (draft: ${draft})`);
};

const mergePR = async (number: number, title: string, message: string, method: string, repoOwner = undefined, repoName = undefined) => {
    const owner = repoOwner ? repoOwner : github.context.repo.owner;
    const repo = repoName ? repoName : github.context.repo.repo;
    
    core.info(`Merging PR in repo ${owner}/${repo} (PR Number: ${number})...`);

    const parameters: {owner: string, repo: string, pull_number: number, merge_method: string, commit_title?: string, commit_message?: string} = {owner, repo, pull_number: number, merge_method: method};

    if (String(title).trim().length > 0) {
        parameters.commit_title = title;
    }

    if (String(message).trim().length > 0) {
        parameters.commit_message = message;
    }

    const response = await getClient().pulls.merge(parameters);

    if (response && response.data && response.data.sha) {
        const sha = response.data.sha;
        core.info(`Merged PR: # ${number} (SHA: ${sha})`);
        return sha;
    }

    throw new Error(`Error merging PR in repo ${owner}/${repo} (PR Number: ${number})`);
}

export {
    getOpenPR,
    updatePR,
    createPR,
    mergePR
};
