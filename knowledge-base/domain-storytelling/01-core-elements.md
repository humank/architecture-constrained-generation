# Domain Storytelling: Core Elements

## Pictographic Language

Domain Storytelling uses a visual, sentence-based notation to capture how people work together.

### Actors

Persons, groups/teams, or software systems that play an active role in the story.

- Depicted as larger icons than work objects
- Always nouns (grammatical role)
- Every sentence starts with an actor who initiates an activity
- Each actor appears only once per activity in a domain story

### Work Objects

Things like documents, physical items, messages, or abstract concepts.

- Always nouns (grammatical role)
- Created, worked with, and exchanged by actors
- Can represent information about work objects
- Same work object can have different icons if the medium changes (e.g., physical vs. digital ticket)
- For each activity, a separate work object is drawn (even if same object appeared before)

### Activities

Verbs that represent what actors do with work objects.

- Always expressed as action verbs
- Connect actors to work objects (and sometimes other actors)
- Depicted as labeled arrows originating from actors
- Expressed in **business/domain language**, not technical language

### Sequence Numbers

Numerical ordering establishing temporal flow.

- Documents the order of activities
- Makes stories replayable and reliable
- Placed at the origin of the arrow
- Fundamental for ensuring shared understanding

### Annotations

Textual complementary information beyond the pictographic elements.

- Document variations (other cases, alternative scenarios)
- Explain terms from the domain language
- Document assumptions or constraints
- Note anything noteworthy about an activity

### Groups

Visual containers that organize and cluster related elements.

- Organize actors and work objects visually
- Help identify related activities
- Support bounded context identification
- Aid in managing complexity of larger stories

### Colors

Optional visual differentiation for highlighting different entity types or domains.

---

## Sentence Structure

Every domain story sentence follows:

```
Actor (subject) → [Activity/verb + sequence number] → Work Object (object)
```

Example: `1. Customer → [submits] → Order Form`

**No symbols for**:
- Conditionals (if/then/else)
- Parallel activities
- Loops or iterations
- Exceptions

These are handled through annotations or separate stories. This is a **deliberate simplification**.
