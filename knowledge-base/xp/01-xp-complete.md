# XP (Extreme Programming): Complete Reference

## Five Values

| Value | Description |
|---|---|
| **Communication** | Ensure every team member knows what's expected and what everyone else is working on |
| **Simplicity** | Do what is needed and no more. Maximize value created for effort invested |
| **Feedback** | Get feedback fast, act on it, and improve continuously |
| **Courage** | Tell the truth about progress, adapt to change, discard failed approaches |
| **Respect** | Everyone contributes value; treat team members with respect |

---

## Fourteen Principles

| Principle | Description |
|---|---|
| **Humanity** | Software is developed by people; honor human needs |
| **Economics** | Technical decisions have business value consequences |
| **Mutual Benefit** | Every activity should benefit all concerned (now and future) |
| **Self-Similarity** | Apply patterns that work at one scale to other scales |
| **Improvement** | Perfect is the enemy of good. Improve continuously |
| **Diversity** | Diverse perspectives enable better solutions through healthy conflict |
| **Reflection** | Think about how and why you work; don't just work |
| **Flow** | Deliver value continuously, not in large batches |
| **Opportunity** | Learn to see problems as opportunities for change |
| **Redundancy** | Critical problems should be solved in multiple ways |
| **Failure** | Failing is acceptable when it produces learning |
| **Quality** | Sacrificing quality is not an effective way to go faster |
| **Baby Steps** | Take the smallest step that moves you forward |
| **Accepted Responsibility** | Responsibility cannot be assigned; it must be accepted |

---

## Primary Practices

| Practice | Description |
|---|---|
| **Sit Together** | Co-located team in shared workspace |
| **Whole Team** | All skills needed are present on the team |
| **Informative Workspace** | Workspace shows project status (big visible charts) |
| **Energized Work** | Sustainable pace; no overwork |
| **Pair Programming** | Two programmers, one keyboard; driver and navigator |
| **Stories** | Unit of functionality from customer's perspective |
| **Weekly Cycle** | Plan each week's work at the start of the week |
| **Quarterly Cycle** | Reflect on team, project, and alignment with big picture |
| **Slack** | Include some lower-priority tasks that can be dropped |
| **Ten-Minute Build** | Build the entire system in under ten minutes |
| **Continuous Integration** | Integrate and test changes multiple times per day |
| **Test-First Programming** | Write failing tests before production code |
| **Incremental Design** | Design emerges and improves continuously |

---

## Corollary Practices

Advanced practices that require primary practices as foundation.

| Practice | Description |
|---|---|
| **Real Customer Involvement** | Actual end users participate in planning and feedback |
| **Incremental Deployment** | Deploy in small increments rather than big bang releases |
| **Team Continuity** | Keep teams together; minimize disruption |
| **Shrinking Teams** | As team improves, maintain load with fewer people |
| **Root-Cause Analysis** | Find and fix the underlying cause of defects |
| **Shared Code** | Anyone can improve any code anywhere |
| **Code and Tests** | Only code and tests are permanent artifacts |
| **Single Code Base** | One code stream; don't fork |
| **Daily Deployment** | Deploy to production every day |
| **Negotiated Scope Contract** | Fix time and cost; negotiate scope |
| **Pay-Per-Use** | Charge per use to get real feedback on value |

---

## Planning Game

### Release Planning

- Customer presents desired features (stories)
- Developers estimate stories (story points)
- Customer prioritizes stories by business value
- Team selects stories that fit the release budget (velocity x iterations)

### Iteration Planning

- Team selects stories from release plan for this iteration
- Stories broken into tasks
- Developers sign up for tasks
- Tasks estimated in ideal hours
- Commitment based on available capacity

---

## User Stories

### INVEST Criteria

| Criterion | Description |
|---|---|
| **I**ndependent | Stories should be independent of each other |
| **N**egotiable | Details are negotiated, not specified upfront |
| **V**aluable | Must deliver value to the customer |
| **E**stimable | Developers must be able to estimate the effort |
| **S**mall | Small enough to plan and complete in an iteration |
| **T**estable | Must be possible to write tests to verify completion |

### Story Format

```
As a [role]
I want [feature]
So that [benefit]
```

### Story Points and Velocity

- **Story Points** — Relative estimation of effort/complexity
- **Velocity** — Number of story points completed per iteration
- **Yesterday's Weather** — Best predictor of next iteration's velocity is last iteration's velocity
