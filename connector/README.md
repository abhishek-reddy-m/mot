# StayOS Connector

Lets the StayOS agent (and voice) work a hotel's **existing** PMS — no migration needed.

| Mode | Where it runs | Who signs in to the PMS |
| --- | --- | --- |
| **Desktop** | A front-desk computer at the hotel | Staff, once, in the connector's browser window. Logins never leave the computer. |
| **Cloud** | StayOS infrastructure (`worker`) | The worker, with a login sealed in the StayOS vault (AES-256-GCM). The AI never sees it — it asks for a credential and the worker types it. |

## How it works

1. Staff ask the agent something ("check in the Smiths in room 204"). Changes become a plan that a person confirms; look-ups go straight through.
2. The confirmed task is queued for the hotel's connection.
3. The connector claims it, opens the PMS, and loops: **screenshot → StayOS server → next browser actions**. The computer-use model runs on the StayOS server; the connector holds no API keys.
4. The result ("DONE: checked in Jordan Smith to 204") shows up live in the agent conversation and on the *Your PMS* page.

Guardrails sent with every task: change only what was asked, never delete reservations, issue refunds, change users or export data, and stop with `NEEDS_HELP` whenever something is ambiguous. Look-up tasks are read-only. Each task stops after 60 steps.

The script lives at `public/downloads/stayos-connector.mjs` and is served at `/downloads/stayos-connector.mjs` (the *Your PMS* page links to it).

## Desktop setup

```bash
curl -O https://your-stayos.app/downloads/stayos-connector.mjs
npm i playwright && npx playwright install chromium
# In StayOS: Your PMS → Desktop connector → Create pairing code
node stayos-connector.mjs pair ABC234 --server https://your-stayos.app --name "Front desk PC"
node stayos-connector.mjs run
```

Sign in to your PMS in the browser window that opens and leave it running. The pairing token is stored in `~/.stayos/connector.json` (permissions 600). Disconnect it any time from the console.

## Cloud worker (StayOS operators)

```bash
STAYOS_SERVER=https://your-stayos.app BRIDGE_WORKER_SECRET=… node stayos-connector.mjs worker
```

Each task gets a fresh, isolated browser context. Server needs `OPENAI_API_KEY`, `STAYOS_VAULT_KEY`, `BRIDGE_WORKER_SECRET`; optionally `BRIDGE_OPERATOR_MODEL` (default `computer-use-preview`) and `BRIDGE_OPERATOR_TOOL=computer` for the GA computer tool.

## Moving to StayOS later

Everything the agent learns about your rooms and guests can be imported when you switch. Until then, nothing in your PMS changes without a person confirming it.
