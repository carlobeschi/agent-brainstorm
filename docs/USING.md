# Using agent-brainstorm

This guide covers what the app is good for, and how you choose where *you* step in: from pressing Start and watching, to taking every key decision yourself, to facilitating the agents as they work.

## What it is good for

The app lets several AI agents, usually from different labs, explore one problem side by side, judge each other's ideas without knowing who wrote them, and each build the ideas that came out on top. That makes it useful for:

- **Getting a wider spread of ideas.** Different models notice different things. With research turned on, each one brings its own findings and sources before proposing anything.
- **Seeing the same idea in different hands.** Every agent builds every winning idea, so you can compare implementations of one plan instead of one implementation of several plans.
- **Choosing a tool or model for a kind of work.** Run the same problem with different agents, instructions or settings and compare what comes out.
- **Studying how agents judge and collaborate.** You can see which ideas win blind votes, and whether winning ideas are the ones that turn out well. You can also check whether longer pitches win, whether a generous voter skews the result, and whether a report matches the work.
- **Small real tasks.** An interface tweak, a bug hunt with clues spread across files and logs, a feature with constraints in an existing project, or an open brief such as "make this easier for a first-time user". The **Start from an example** menu has one of each.

What it is not: a way to ship code without looking. Every build stays on its own branch in a run folder on your computer; nothing is pushed, merged or published.

## Where you can step in

The app has a lean flow and optional interactive layers.

- **Lean (the default).** Every check-in below is left to the agents. You press Start and the run goes from start to finish on its own, with nobody at the screen.
- **Interactive.** Each setting you turn on adds one place where the run stops and waits for you. You can add one, several or all of them.

A run has five moments where a person can take part, plus two ways for the agents to come to you. Each has a setting on the start form.

| Moment | Leave it to the agents | Do it yourself | Setting |
|---|---|---|---|
| **1. The brief** | One agent turns a short goal ("a nicer cat game") into the full problem every step works from. You can read it on the run page. | You write the full problem yourself. | **Who writes the brief?** |
| **2. Research** | Each agent researches alone and shares its findings, or keeps them. | Put what you know into the problem or the context folder, and turn research off. | **Research first?** and **Context** |
| **3. Judging the ideas** | Agents score each other's ideas (never their own), on your criteria if you give any. | Write the criteria they must use. Add your own blind pick to compare with theirs. | **Voting criteria**, **Pick blind** |
| **4. What gets built** | The ideas with the best average go forward. | The run stops after the vote and waits for you to choose, before or after seeing the vote. | **Who decides what gets built?** (with **Pick blind** to choose without seeing authors or votes) |
| **Questions before the start** | Each agent works from the brief as it is. | Each agent may ask you up to three questions before any work starts. You answer each one, or let the agents decide. Every agent then sees all the questions and answers, without names. | **Agents may ask me questions before they start** |
| **Help at any step** | An agent with a doubt decides by itself. | An agent with a doubt stops and asks you. A box appears at the top of the run page, and the tab title shows how many questions are waiting. When you answer, the agent's step starts again with your answer. | **Agents may stop and ask me for help at any step** |
| **5. The final judgement** | There is no agent vote on the builds: you see them side by side with their reports. | Score each idea apart from each agent's execution, and note whether each report matches what you found. | **Your look at the results**, at the end of the run page |

Two more settings shape a run without being check-ins: **Instructions written by** (whose words the agents follow at every step) and **Words per idea, at most**.

### The levels in practice

**Level 0: press go and watch.**

- Pick an example, or type a one-line goal and let an agent write the brief.
- Leave "Who decides" on the agents' vote, and press Start.
- Watch it live, or come back to the result at the top of the page: the winning ideas, each agent's build, and the files it changed.

**Level 1: you set the frame.**

- Write the brief yourself, give the context folder, and add two or three voting criteria that say what "good" means to you.
- From there, the agents run the rest.

**Level 2: you choose what gets built.**

- Set **Who decides what gets built?** to *Me*. After the vote, the run stops with "Your turn" at the top.
- You see every score with its reason, choose the ideas to build, and press **Build these**. Or let the vote decide.
- Your choice is saved, with what the agents would have picked.

**Level 3: you choose blind.** Also tick **Pick blind**.

- While the agents vote, you see only the ideas: shuffled, without authors, with their length in words.
- You choose first. Then the authors and the vote appear, and the run builds what you chose.
- This keeps your judgement free of the agents' scores, and shows you afterwards where you and they disagreed.

**Facilitator: the agents can come to you.** Tick one or both of the boxes for questions.

- Before the start, the run shows the agents' questions in a box at the top of the page and waits. Answer each one, or press **Let it decide**.
- With help on, any agent can stop during research, ideas, the vote or the build to ask you something. Only the agent that asked hears your answer.
- Every question and answer is kept in the run, in **Questions and answers** on the run page and in `state.json`.
- This is the role of a facilitator in a design sprint: you don't do the work, you remove the doubts that would send it the wrong way.

Two limits to know:

- An agent cannot be interrupted in the middle of its work. It stops itself by ending its turn with a question, and then its step starts again with your answer. A build keeps the files it had already changed.
- An agent can ask for help at most twice in one step. After that it must decide alone. While a question waits, the run waits too, so leave these boxes off when nobody is watching.

**Level 4: you judge the end result too.**

- When the builds are done, fill in **Your look at the results**:
  - a score for each idea;
  - a score for each agent's take on it;
  - whether each report "matches", "claims more" or "claims less" than you found.
- Over several runs, this tells you whether the ideas that win votes are the ones that turn out well.

You can mix levels, for example an agent-written brief with your choice of what gets built, or questions before the start with no other check-in.

## A few tips

- **Two or three agents, two or three ideas each,** is plenty to start with. Every agent builds every winning idea, so the build step grows with both numbers.
- **Give a context.** Agents propose better ideas when they can read the material: a folder or a git link. They each work on a copy; your original is never touched.
- **Criteria make votes readable.** Without them each vote is one score and a sentence. With them you see why an idea won or lost, criterion by criterion. Too many criteria tend to make all the scores look alike.
- **Mind the rooms.** An agent that cannot search the web or run commands is working in a different room from one that can. The run page shows this under each agent. Keep it in mind before concluding that one model is better.
- **The vote is not a verdict.** Each author is judged by a different set of voters, since nobody scores their own ideas. Look at the adjusted average next to the plain one, and try a word limit if one agent writes much longer pitches.
- **Everything is saved.** Every prompt, reply, score, patch, your pick and your ratings go in the run folder (`~/.agent-brainstorm/runs/`), so you can come back to a run or compare several.
