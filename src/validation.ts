import * as core from '@actions/core';

let defaultPRTitle = false;

const readInputParameters = (options?: any): input => {
    if (options !== undefined) {
        core.info('Reading input parameters from internal method...');
        return validateOptions(options);
    }

    core.info('Reading input parameters from GitHub workflow...');

    const inputOptions: input = {
        token: core.getInput('token', {required: true, trimWhitespace: true}),
        prFromBranch: core.getInput('pr-from-branch', {required: true}),
        prToBranch: core.getInput('pr-to-branch', {required: true}),
        prTitle: core.getInput('pr-title', {trimWhitespace: true}),
        prHotfixNumber: core.getInput('pr-hotfix-number'),
        prBody: core.getInput('pr-body', {trimWhitespace: true}),
        prFailIfExists: core.getBooleanInput('pr-fail-if-exists'),
        prUpdateIfExists: core.getBooleanInput('pr-update-if-exists'),
        maintainerCanModify: core.getBooleanInput('maintainer-can-modify'),
        repoOwner: core.getInput('repo-owner'),
        repoName: core.getInput('repo-name'),
    };

    return validateOptions(inputOptions);
};

interface input {
    token: string,
    prFromBranch: string,
    prToBranch: string,
    prTitle: string,
    prHotfixNumber: string,
    prBody: string,
    prFailIfExists: boolean,
    prUpdateIfExists:boolean,
    maintainerCanModify: boolean,
    repoOwner: string,
    repoName: string,
}

const validateOptions = (inputs: input): input => {
    const errors = [];
    core.info('Validating input parameters...');

    if (String(inputs.prTitle).trim().length === 0) {
        inputs.prTitle = `[Backport PR] From ${inputs.prFromBranch} to ${inputs.prToBranch}`;
        defaultPRTitle = true;
    }

    core.info('Input parameters validation passed successfully');

    return inputs;
};

const isDefaultTitle = (): boolean => defaultPRTitle;

export {
    readInputParameters,
    isDefaultTitle,
    input
};
