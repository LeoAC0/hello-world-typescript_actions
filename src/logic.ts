import * as core from '@actions/core';
import * as github from '@actions/github';

import { initClient, getClient } from './api';
import { createPR, listOpenBackportPRs, PullsListResponseItem } from './pr';
import { readInputParameters } from './validation';
import { createBranch, branchHash } from './branch';

const start = async (): Promise<void> => {
    // Read input parameters from workflow
    const options = readInputParameters();

    // Init REST API Client with auth token
    initClient(options.token);

    // Get open PRs
    let hotfixes: { number: number, title: string, html_url: string }[] = await listOpenBackportPRs();

    if (hotfixes.length > 0 && options.prFailIfExists) {
        const hotfix = hotfixes[0];
        throw new Error(`An active PR was found ('pr-fail-if-exists' is true): # ${hotfix.number} (${hotfix.html_url})`);
    }

    if (hotfixes.length > 0 && !options.prUpdateIfExists) {
        const hotfix = hotfixes[0];
        core.warning(`An active PR was found but 'pr-update-if-exists' is false, finished action tasks`);
        core.setOutput('pr-number', hotfix.number);
        core.setOutput('pr-url', hotfix.html_url);
        return;
    }

    const branchHotfix = github.context.payload.pull_request?.head?.ref;

    if (hotfixes.length === 0) {
        // No se encontraron PRs abiertos, así que creamos uno
        await createBranch({ branchName: branchHotfix, repoOwner: options.repoOwner, repoName: options.repoName });
        const newPr = await createPR(branchHash, options.prToBranch, options.prTitle, options.prBody);
        hotfixes.push(newPr);
    } else {
        // Mergeamos la rama de backport con main

        const hotfix = hotfixes[0];
        await getClient().repos.merge({
            owner: options.repoOwner || github.context.repo.owner,
            repo: options.repoName || github.context.repo.repo,
            base: 'main',
            head: hotfix.title, // Ajusta esto según la lógica que estás utilizando para el nombre de la rama
        });

        console.log("Merged main into " + branchHotfix);
    }

    core.setOutput('pr-number', hotfixes[0].number);
    core.setOutput('pr-url', hotfixes[0].html_url);
};

export {
    start
};

