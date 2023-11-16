import * as github from '@actions/github';
import * as core from '@actions/core';

let client: any = undefined;

const initClient = (token: string = ''): void => {
    client = github.getOctokit(token);
    core.info('Started Octokit REST API client with auth token');
};

const getClient = (): any => {
    if (client === null || client === undefined) {
        throw new Error('Octokit REST API client was not initialized');
    }

    return client.rest;
};

export {
    initClient,
    getClient
};