# agent-brainstorm

A small local web page where AI coding agents from different labs (Claude Code, Codex, Gemini through Antigravity, Mistral through Vibe, or your own) work on one problem together, without talking to each other:

1. **Research** (optional). Each agent looks into the problem alone and brings back a few findings with sources, plus one surprise.
2. **Ideas.** Each agent proposes its own ideas, alone.
3. **Vote.** Each agent scores the *other* agents' ideas from 1 to 10, with a reason. The ideas are shown without names and in a shuffled order, and an agent never sees its own.
4. **Build.** The best ideas go forward, and *every* agent builds *all* of them, alone, on its own git branch of a copy of your material.

You watch it live: ideas as they come, every score with its reason, and each build side by side with its files and patch. Nothing is pushed or published; everything stays in a run folder on your computer.

It is a way to see what several agents come up with for the same problem, how they judge each other's ideas when they can't see who wrote them, and how the same idea turns out in different hands.

You choose how much to take part. The lean default runs on its own: press Start and watch (an agent can even write the brief from a one-line goal). Optional layers make it interactive: you can choose which ideas get built, judge the results, and act as a facilitator whom the agents can ask questions before they start or whenever they need help. **[docs/USING.md](docs/USING.md)** explains what the app is good for and each place where you can step in.

## Run it

You need Node.js 18 or newer, git, and at least two agent command-line tools installed and signed in, for example [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`), [Codex](https://github.com/openai/codex) (`codex`), Antigravity (`agy`) or Mistral Vibe (`vibe`).

```sh
git clone https://github.com/carlobeschi/agent-brainstorm.git
cd agent-brainstorm
npm start
```

Open the link it prints: it carries a one-time key, so only you can use the page. On a Mac, `bash scripts/start-mac.sh` does the same, opens the browser, and takes any API keys an agent needs from the Keychain.

The agents that are not installed are greyed out. Click **Test the agents first** to check that each ticked agent can read a file, write a file and, if it researches on the web, read a web page.

## The form

| Setting | What it does |
|---|---|
| **Start from an example** | Fills in the form with one of four ready-made software scenarios (below). |
| **The problem** | What the agents should explore, in your own words. |
| **Who writes the brief?** | You (what you typed is the problem), or one of the agents, from what you typed as a short goal. |
| **Context** | A folder on your computer or a git link. The agents read it; each builds on its own copy, and the original is never changed. Leave empty for no material. |
| **Agents** | Who takes part (at least two, since nobody scores its own ideas). |
| **Research first?** | No; yes and everyone reads everyone's findings (without names); or yes and each keeps its own. Research is read-only. Agents whose research command allows it may search and read the web. |
| **Voting criteria** | Optional, one per line. Each agent then scores every idea on each criterion, with a sentence why, and an idea's score is their average. |
| **Instructions written by** | Who wrote the prompts for every step (see *Whose words?* below). |
| **Ideas per agent / to carry forward / minutes to build** | The size of the run. |
| **Words per idea, at most** | Optional cap, to test whether longer pitches win votes. |
| **Who decides what gets built?** | The agents' vote, or you: the run waits after the vote until you choose (or hand it back to the vote). |
| **Agents may ask me questions before they start** | After the brief, each agent may ask you up to three questions. The run waits for your answers; every agent then sees all of them, without names. |
| **Agents may stop and ask me for help at any step** | An agent with a doubt stops and asks you. A box appears at the top of the page, and the agent's step starts again with your answer (at most twice per step). |
| **Pick blind** | Hides authors, votes and builds until you have picked your own favourite ideas and said why (or skipped). Your pick is saved with the run; if you decide what gets built, it is your choice. |

## What you see, and what is saved

- **Progress** at the top: each phase with its counts, a line per agent saying what it is doing, and its last line of output. Each agent's *room* is shown too: whether it had the web, could edit files, could run commands, and any step that failed or had to be retried. Agents with different tools are working in different rooms, which limits what a run says about the models themselves.
- **The result** first: the winning ideas and what each agent built.
- **Research**: findings with their sources and the surprise.
- **Ideas**, with their length in words.
- **Vote**: every score and reason, the plain average and an *adjusted* average. Nobody scores its own ideas, so each author is judged by a different panel, and a generous voter lifts only the others. The adjusted score takes out each voter's own mean. The cut uses the plain average, ties broken by lot.
- **Build**: each agent's report (what it built, how to see it, what it left out), the files it changed (open them, or compare the same file across two agents) and the whole patch.
- **Your look at the results**: score each winning idea apart from each agent's execution of it. Also note whether each build report matches what you found ("claims more", "claims less"): a gap, not a verdict, since the agent may not have noticed.

Each run is a folder in `~/.agent-brainstorm/runs/<date>-<words>/`:

- `state.json`: everything the page shows, including your pick, your ratings, and the agents' questions with your answers;
- `steps/`: every prompt and reply;
- `research.md`;
- `repo/`: the copy of the context;
- `build/<agent>/`: each agent's git branch `brainstorm/<agent>`;
- `patches/<agent>.patch`.

## Examples

**Start from an example** offers four kinds of software work:

| Example | Context | What it shows |
|---|---|---|
| A small interface improvement | this app's own page (`@app`) | Whether a change is understandable, and whether what worked still works. |
| An unfamiliar bug | `app/examples/shop-totals`: a tiny shop whose clues are spread across code, data, a changelog and an order log, with a red herring | Whether agents gain from sharing what they find, not just ideas. |
| A constrained feature | `app/examples/notes-cli`: a small notes tool with tests and a file format other scripts read | How ideas survive a real codebase and its rules. |
| An open brief | this app (`@app`): "make it easier for a first-time user" | Whether different agents notice different problems before proposing solutions. |

Each example project's own tests run with `node --test` in its folder.

## End-to-end scenarios

`npm run scenarios` plays whole runs through the app, with a script in the person's place. It answers the agents' questions and makes the person's pick, as each scenario in `scenarios/scenarios.json` says.

```sh
npm run scenarios -- --agents claude,codex                  # all scenarios, real agents
npm run scenarios -- --agents claude,codex --only lean-bug  # one scenario
npm run scenarios -- --fake                                 # the tests' fake agents: free and offline
```

| Scenario | Task | Settings it tries |
|---|---|---|
| `lean-bug` | the shop-totals bug | the lean default: nobody at the screen |
| `facilitated-feature` | tags in notes-cli | questions before the start and help at any step; the tag syntax is known only to the person |
| `person-decides-blind` | the shop-totals bug, from a one-line goal | brief by an agent, shared research, criteria, a word limit, and the person's blind choice of what gets built |

Each scenario gets two kinds of checks:

- **Flow** (the app): did the run do what its settings say? For example: every agent built the winners, the answers reached every agent, the person's choice was built. A failed flow check makes the command exit with 1.
- **Outcome** (the agents): each build's own tests, plus hidden tests from `scenarios/checks/` that the agents never see. The untouched copy is tested too, as a baseline.

The outcome step runs the code each agent wrote, with `node --test` in a scratch copy, an empty home and only `PATH`. Add `--no-outcome` to skip it.

The report (Markdown and JSON) is saved next to the runs, and the runs themselves show up on the page as usual. Cost is not measured: with subscriptions a run uses quota, not money.

## Your own agents and models

The agents come from `app/agents.json`. To change them, copy it to `~/.agent-brainstorm/agents.json` (or point `BRAINSTORM_AGENTS` at a file) and edit it. Each agent has:

- **Commands:**
  - `read`: used for ideas and votes. It may only read files in its folder.
  - `build`: may also edit files, in its own copy only.
  - `research` (optional): read-only. With `"web": true` it may also search and read the web.
- **Placeholders:**
  - `{model}`, filled from `model`. With an empty model, the flag before it is dropped and the tool's default model is used.
  - `{prompt}`. The prompt goes on stdin unless the command has `{prompt}`.
  - `{price}`, filled from `max_price`.
- **Options:**
  - `env`: the environment variables the agent may see, such as an API key. It gets nothing else from your shell.
  - `can_run`: set it if the build sandbox lets the agent run commands.
  - `clean_home`: runs the agent with an empty home folder, so it loads none of your skills or settings.

Commands with flags that loosen permissions (`--dangerously-…`, bypass, yolo, full access, allow-lists, a shell tool) are refused.

As shipped, the agents are restricted as follows:

- **Claude Code:** limited to read, search and edit tools, in safe mode, with no MCP servers.
- **Codex:** read-only to propose and vote; for builds, workspace-write with no network.
- **Antigravity:** sandboxed, with an explicit allow/deny list.
- **Vibe:** file tools only.

## Whose words?

The built-in prompts for every step were written by Claude. An agent may do better with prompts that suit it, so another agent can write a whole set of its own:

```sh
npm run write-prompts -- codex
```

The agent runs read-only in an empty folder. It gets only the purpose of each step and the facts it may use as `{placeholders}`, never the built-in text. Its set is saved in `~/.agent-brainstorm/instructions/codex.json` and offered under **Instructions written by**. Whoever wrote the rest, the app always adds the reply formats it reads.

## Safety

- The server listens on 127.0.0.1 only.
- It checks the Host header.
- A fresh key at each start lives only in the link's `#fragment` and is required on every API call.
- POSTs must come from the page itself, and the page cannot be framed.
- Its content security policy runs only its own script.
- Agent text is always shown as text, never as HTML. Links in findings are http(s) only.
- Files are served only from inside a run folder.
- Agents get only the environment variables their entry lists, and each builds in its own copy.

Never put API keys in `agents.json` or the page. Give them through the environment (`env`), or the Keychain on a Mac.

## Settings

| Variable | Default |
|---|---|
| `BRAINSTORM_PORT` | `8795` |
| `BRAINSTORM_HOME` | `~/.agent-brainstorm` |
| `BRAINSTORM_OUT` | `~/.agent-brainstorm/runs` |
| `BRAINSTORM_AGENTS` | `~/.agent-brainstorm/agents.json` if present, else `app/agents.json` |
| `BRAINSTORM_INSTRUCTIONS` | `~/.agent-brainstorm/instructions` |
| `BRAINSTORM_OPEN` | open the browser at start (Mac) |
| `BRAINSTORM_WEB_PROBE` | the page "Test the agents first" reads (`https://example.com`) |

## Develop

```sh
npm ci
npx playwright install chromium
npm run check   # lint, type check, tests
```

The tests drive the real app and page against fake agents (`tests/fixtures/brainstorm/fake.js`). They never call a model, so they are free and offline.

## Origin

This app began inside [agents-wrapper](https://github.com/carlobeschi/agents-wrapper), a set of experiments on how AI agents from different labs work together. There, a "game jam" had several agents improve a small game; this page makes that loop general, for any problem. The shared helpers in `app/common.js` come from there.

## Licence

GPL-3.0-only, like agents-wrapper. See [LICENSE](LICENSE).
