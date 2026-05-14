import {debug as logDebug, error as logError, getInput, info as logInfo, setFailed, setOutput} from '@actions/core';
import fetch from 'node-fetch';

async function run(): Promise<void> {
    try {
        const jiraWebhook: string = getInput('jira-webhook');

        setOutput('raw-commits', getInput('commits'));
        logDebug(getInput('commits'));

        const commits: Array<string> = JSON.parse(getInput('commits'));

        setOutput('parsed-commits', commits);
        logDebug(JSON.stringify(commits));

        if (!isValidHttpUrl(jiraWebhook)) {
            setFailed('The provided Jira webhook URL wasn\'t valid.');
        }

        const isJiraKey = (jiraKey: string | null): jiraKey is string => jiraKey !== null

        let issueKeys: string[] = [...new Set<string>(
            commits
                .flatMap((commit: string): RegExpMatchArray | null => getJiraIssueKey(commit))
                .filter(isJiraKey)
                .map((jiraKey: string): string => jiraKey.toUpperCase())
        )];

        logInfo(`Found ${issueKeys.length} issue keys in ${commits.length} commits.`)

        setOutput('jira-issue-keys', issueKeys);
        logDebug(JSON.stringify(issueKeys));

        issueKeys.forEach((issue: string) => {
            sendRequestToJira(jiraWebhook, issue);
        })
    } catch (error: any) {
        logError(error);

        if (error instanceof Error) setFailed(error.message);
    }
}

function isValidHttpUrl(string: string): boolean {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
}

function getJiraIssueKey(commit: string | null): RegExpMatchArray | null {
    if (typeof commit !== 'undefined' && commit !== null) {
        return commit.match(/JIRA-\d+/i);
    }

    return null;
}

function sendRequestToJira(jiraWebhookUrl: string, jiraIssue: string) {
    logDebug(`Sending ticket to Jira: ${jiraIssue}`);

    fetch(jiraWebhookUrl, {
        method: 'POST',
        body: JSON.stringify({
            issues: [jiraIssue],
            body: jiraIssue
        })
    }).catch(
        error => logError(error)
    );
}

run();
