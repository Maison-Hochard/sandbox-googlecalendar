const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const {Command} = require('commander');
const program = new Command();

program
    .usage('[options]')
    .option('-c, --calendar <calendar>', 'Calendar ID')
    .option('-s, --summary <summary>', 'Event summary')
    .option('-l, --location <location>', 'Event location')
    .option('-d, --description <description>', 'Event description')
    .option('-S, --start <start>', 'Event start date')
    .option('-E, --end <end>', 'Event end date')
    .option('-z, --timezone <timezone>', 'Event timezone')
    .parse(process.argv);

const options = program.opts();

async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

async function createEvents(auth) {
    const calendar = google.calendar({version: 'v3', auth});
    const res = await calendar.events.insert({
        calendarId: options.calendar,
        resource: {
            summary: options.summary,
            location: options.location,
            description: options.description,
            start: {
                dateTime: options.start,
                timeZone: options.timezone,
            },
            end: {
                dateTime: options.end,
                timeZone: options.timezone,
            },
        }
    });
}

authorize().then(createEvents).catch(console.error);