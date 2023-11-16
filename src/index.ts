import * as core from '@actions/core';
import { start } from './logic';

const run = async (): Promise<void> => {
    core.info(`Starting cm-backport-pr action at ${new Date()}...`);
    await start();
};

run().catch(error => core.setFailed(error.message));
