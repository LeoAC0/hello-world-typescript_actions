import * as core from '@actions/core';
import * as github from '@actions/github';

import { initClient, getClient } from './api';
import { createPR, listOpenBackportPRs, PullsListResponseItem } from './pr';
import { readInputParameters, input } from './validation';
import { createBranch, branchHash } from './branch';

const getPRDetails = async (owner: string, repo: string, prNumber: number): Promise<any> => {
    const response = await getClient().pulls.get({
        owner,
        repo,
        pull_number: prNumber,
    });

    return response.data;
};

const updateBackportPRBody = async (backportPr: input, prNumber: number, prBody: string): Promise<void> => {

    console.log("Dentro del update Body");
    
    console.log("prHotfix: " + backportPr.prHotfixNumber);
    console.log("repoOwner: " + github.context.repo.owner);
    console.log("repoName: " + github.context.repo.repo);
    

    const response = await getClient().pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: backportPr.prHotfixNumber
    });
    
    const pullRequestHotfixData = response.data;
    
    const hotfixTitle = pullRequestHotfixData.title;
    const hotfixLink = pullRequestHotfixData.html_url;
    
    console.log("prBody" + prBody);
    console.log("hotfixTitle: " + hotfixTitle);
    console.log("hotfixLink: " + hotfixLink);

    await getClient().pulls.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
        body: `${prBody} \n ${hotfixTitle}, ${hotfixLink} `,
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
        const newPr = await createPR(branchHash, options.prToBranch, options.prTitle, options.prHotfixNumber);
        prs.push(newPr);
    } else {
        // Mergeamos la rama de backport con main
        
        const pr = prs[0]; // Supongo que vamos a tener una sola PR abierta, por eso elijo la 1era.

        core.info(`pr: ${pr}`);
        core.info(`prs: ${prs}`);
        console.log(github.context.repo.owner);
        console.log(options.repoOwner);
        console.log(github.context.repo.repo);
        console.log(options.repoName);
        
        
        
        await getClient().repos.merge({
            //owner: options.repoOwner || github.context.repo.owner,
            //repo: options.repoName || github.context.repo.repo,
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            base: pr.head.ref,
            head: 'main',
        });
        
        console.log("Merged main into " + branchHotfix);
        
        const prNumber = pr.number;
        const prBody = pr.body;
        console.log("prNumberBackport: " + prNumber);
        
        await updateBackportPRBody(options, prNumber, prBody);
    }

    core.setOutput('pr-number', prs[0].number);
    core.setOutput('pr-url', prs[0].html_url);
};

export {
    start
};

