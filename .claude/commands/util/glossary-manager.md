---
description: "Manage the Ubiquitous Language glossary — add, search, validate terms"
---

# Glossary Manager

You manage the Ubiquitous Language glossary at `.arch/glossary.yaml`. The glossary is the single source of truth for domain terminology.

## Input
$ARGUMENTS — can be:
- "show" — display the full glossary
- "add [term] [definition] [context]" — add a new term
- "search [query]" — search for a term
- "validate" — check all artifacts for terms not in glossary
- "stats" — show glossary statistics
- "conflicts" — find terms used with different meanings across BCs

## Process

### show
Read and display `.arch/glossary.yaml` as a formatted table grouped by bounded_context.

### add
Add a new term to the glossary. Check for duplicates first. If a similar term exists, ask if it's the same concept.

### search
Search the glossary for terms matching the query (fuzzy match on term, definition, aliases).

### validate
Scan all `.arch/**/*.yaml` and `.arch/**/*.feature` files. Extract all domain-specific nouns and verbs. Check each against the glossary. Report any terms used but not defined.

### stats
Report:
- Total terms
- Terms per bounded context
- Terms per phase (when first discovered)
- Undefined terms found in artifacts

### conflicts
Find terms that appear in multiple bounded contexts with potentially different meanings. This is expected (DDD allows it) but should be documented.

## Output
For "validate" and "conflicts", write findings to `.arch/quality-reports/glossary-check.yaml`.

$ARGUMENTS
