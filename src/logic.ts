import * as core from '@actions/core';

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

    if (pr !== null && options.prToBranch !== pr.base.ref) {
        // La rama de destino de la PR existente es diferente a la especificada en las opciones

        // Crea una nueva rama para el backport
        const backportBranchName = `backport/${options.prFromBranch.toUpperCase()}`;
        await createBranch({ branchName: backportBranchName, repoOwner: options.repoOwner, repoName: options.repoName });
        core.setOutput('From-Branch: ', options.prToBranch);
        core.setOutput('PR-Base: ', pr.base.ref);
        
        // Actualiza la PR existente con los cambios de la nueva rama
        pr = await createPR(options.prFromBranch, options.prToBranch, options.prTitle, options.prBody);
    }

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
        pr = await createPR(options.prFromBranch, options.prToBranch, options.prTitle, options.prBody);
    }

    let sha = '';

    core.setOutput('pr-number', pr.number);
    core.setOutput('pr-url', pr.html_url);
    core.setOutput('pr-sha', sha);
};

export {
    start
};
