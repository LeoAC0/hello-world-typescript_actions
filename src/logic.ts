import * as core from '@actions/core';
import * as github from '@actions/github';

import { initClient } from './api';
import { getOpenPR, createPR, updatePR } from './pr';
import { readInputParameters } from './validation';
import { createBranch } from './branch';

const start = async (): Promise<void> => {
    // Read input parameters from workflow
    const options = readInputParameters();

    // Init REST API Client with auth token
    initClient(options.token);

    // Get open PR
    let pr = await getOpenPR(options.prFromBranch, options.prToBranch);

    if (pr !== null && options.prFailIfExists) {
        throw new Error(`An active PR was found ('pr-fail-if-exists' is true): # ${pr.number} (${pr.html_url})`)
    }

    if (pr !== null && !options.prUpdateIfExists) {
        core.warning(`An active PR was found but 'pr-update-if-exists' is false, finished action tasks`);

        core.setOutput('pr-number', pr.number);
        core.setOutput('pr-url', pr.html_url);
        core.setOutput('pr-sha', '');

        return;
    }

    if (pr !== null) {
        // Update current PR
        pr = await updatePR(pr.number, options.prTitle, options.prBody);
    } else {
        // Create PR if not exists

        // Crea una nueva rama para el backport
        const branchHotfix = github.context.payload.pull_request?.head?.ref;
        const backportBranchName = `backport-${branchHotfix}`;
        await createBranch({ branchName: backportBranchName, repoOwner: options.repoOwner, repoName: options.repoName });
        //core.setOutput('From-Branch: ', backportBranchName);
        //core.setOutput('PR-Base: ', pr.base.ref);

        pr = await createPR(backportBranchName, options.prToBranch, options.prTitle, options.prBody);
    }

    let sha = '';

    core.setOutput('pr-number', pr.number);
    core.setOutput('pr-url', pr.html_url);
    core.setOutput('pr-sha', sha);
};

export {
    start
};
