import * as core from '@actions/core';
import * as github from '@actions/github';

import { initClient } from './api';
import { getOpenPR, createPR, updatePR, listOpenBackportPRs } from './pr';
import { readInputParameters } from './validation';
import { createBranch, branchHash } from './branch';

const start = async (): Promise<void> => {
    // Read input parameters from workflow
    const options = readInputParameters();

    // Init REST API Client with auth token
    initClient(options.token);

    // Get open PR
    //let pr = await getOpenPR(options.prFromBranch, options.prToBranch);
    let pr = await listOpenBackportPRs();

    if (pr !== null && options.prFailIfExists) {
        throw new Error(`An active PR was found ('pr-fail-if-exists' is true): # ${pr.number} (${pr.html_url})`)
    }

    if (pr !== null && !options.prUpdateIfExists) {
        core.warning(`An active PR was found but 'pr-update-if-exists' is false, finished action tasks`);

        core.setOutput('pr-number', pr.number);
        core.setOutput('pr-url', pr.html_url);

        return;
    }
    const branchHotfix = github.context.payload.pull_request?.head?.ref;
    if (pr == null) {
        // Crea una nueva rama para el backport
        await createBranch({ branchName: branchHotfix, repoOwner: options.repoOwner, repoName: options.repoName });
        // Crea PR de backport
        pr = await createPR(branchHash, options.prToBranch, options.prTitle, options.prBody);
    }else {
        // Mergea la rama de backport con main
        console.log("Dentro del else, encontro PR y va a mergear la rama backport");
        
        pr.repos.merge(options.repoOwner, options.repoName, pr.base.ref, 'main');
        console.log("Merged main into " + branchHotfix);
    }

    core.setOutput('pr-number', pr.number);
    core.setOutput('pr-url', pr.html_url);
};

export {
    start
};
