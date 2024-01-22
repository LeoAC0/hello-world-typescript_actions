import * as core from '@actions/core';
import * as github from '@actions/github';

import { initClient, getClient } from './api';
import { createPR, listOpenBackportPRs, PullsListResponseItem } from './pr';
import { readInputParameters } from './validation';
import { createBranch, branchHash } from './branch';

const getPRDetails = async (owner: string, repo: string, prNumber: number): Promise<any> => {
    const response = await getClient().pulls.get({
        owner,
        repo,
        pull_number: prNumber,
    });

    return response.data;
};

const updateBackportPRBody = async (backportPr: PullsListResponseItem, hotfixPRs: PullsListResponseItem[]): Promise<void> => {
    const prInfoPromises = hotfixPRs.map(async (hotfixPR) => {
        const hotfixInfo = await getPRDetails(github.context.repo.owner, hotfixPR.repo.name, hotfixPR.number);
        return `- [${hotfixInfo.title}](${hotfixInfo.html_url})`;
    });

    const hotfixInfos = await Promise.all(prInfoPromises);

    const updatedBody = `## Backport PR\n\nOriginal PRs included:\n${hotfixInfos.join('\n')}`;

    await getClient().pulls.update({
        owner: github.context.repo.owner,
        repo: backportPr.repo.name,
        pull_number: backportPr.number,
        body: updatedBody,
    });
};

const start = async (): Promise<void> => {
    // Read input parameters from workflow
    const options = readInputParameters();

    // Init REST API Client with auth token
    initClient(options.token);

    // Get open PRs
    let prs: PullsListResponseItem[] = await listOpenBackportPRs();

    if (prs.length > 0 && options.prFailIfExists) {
        const pr = prs[0]; // Supongo que vamos a tener una sola PR abierta, por eso eligo la 1era.
        throw new Error(`An active PR was found ('pr-fail-if-exists' is true): # ${pr.number} (${pr.html_url})`);
    }

    if (prs.length > 0 && !options.prUpdateIfExists) {
        const pr = prs[0]; // Supongo que vamos a tener una sola PR abierta, por eso eligo la 1era.
        core.warning(`An active PR was found but 'pr-update-if-exists' is false, finished action tasks`);
        core.setOutput('pr-number', pr.number);
        core.setOutput('pr-url', pr.html_url);
        return;
    }

    const branchHotfix = github.context.payload.pull_request?.head?.ref;

    if (prs.length === 0) {
        // No se encontraron PRs abiertos, así que creamos uno
        await createBranch({ branchName: branchHotfix, repoOwner: options.repoOwner, repoName: options.repoName });
        const newPr = await createPR(branchHash, options.prToBranch, options.prTitle, options.prBody);
        prs.push(newPr);
    } else {
        // Mergeamos la rama de backport con main
        
        const pr = prs[0]; // Supongo que vamos a tener una sola PR abierta, por eso elijo la 1era.

        await getClient().repos.merge({
            owner: options.repoOwner || github.context.repo.owner,
            repo: options.repoName || github.context.repo.repo,
            base: pr.head.ref,
            head: 'main',
        });
        
        await updateBackportPRBody(pr, prs);
        console.log("Merged main into " + branchHotfix);
    }

    core.setOutput('pr-number', prs[0].number);
    core.setOutput('pr-url', prs[0].html_url);
};

export {
    start
};

