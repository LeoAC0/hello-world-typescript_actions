import * as core from '@actions/core';

let defaultPRTitle = false;

const readInputParameters = (options: any = undefined): any => {
    if (options !== undefined) {
        core.info('Reading input parameters from internal method...');
        return validateOptions(options);
    }

    core.info('Reading input parameters from GitHub workflow...');

    const inputOptions = {
        token: core.getInput('token', {required: true, trimWhitespace: true}),
        prFromBranch: core.getInput('pr-from-branch', {required: true}),
        prToBranch: core.getInput('pr-to-branch', {required: true}),
        prTitle: core.getInput('pr-title', {trimWhitespace: true}),
        prHotfixTitle: core.getInput('pr-hotfix-title'),
        prBody: core.getInput('pr-body', {trimWhitespace: true}),
        prFailIfExists: core.getBooleanInput('pr-fail-if-exists'),
        prUpdateIfExists: core.getBooleanInput('pr-update-if-exists'),
        maintainerCanModify: core.getBooleanInput('maintainer-can-modify'),
    };

    return validateOptions(inputOptions);
};

const validateOptions = (inputs: any = {}): any => {
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
    isDefaultTitle
};
