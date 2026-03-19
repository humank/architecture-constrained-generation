# Refactoring: Code Smells (Complete — Fowler 2nd Edition)

## Bloaters

| # | Smell | Description |
|---|-------|-------------|
| 1 | **Long Function** | Functions that exceed appropriate length; the longer, the harder to understand |
| 2 | **Large Class** | A class tries to do too much, accumulating too many fields/methods/responsibilities |
| 3 | **Primitive Obsession** | Overuse of primitives instead of small objects (currency, ranges, phone numbers) |
| 4 | **Long Parameter List** | More than three or four parameters; confusing and error-prone |
| 5 | **Data Clumps** | Groups of data that repeatedly appear together but aren't encapsulated |

## Object-Orientation Abusers

| # | Smell | Description |
|---|-------|-------------|
| 6 | **Repeated Switches** | Same conditional switching logic duplicated in multiple places |
| 7 | **Temporary Field** | Fields set only under certain circumstances; confusing when empty |
| 8 | **Refused Bequest** | Subclass uses only some inherited methods/properties |
| 9 | **Alternative Classes with Different Interfaces** | Two classes perform identical functions but have different signatures |

## Change Preventers

| # | Smell | Description |
|---|-------|-------------|
| 10 | **Divergent Change** | One module changed for many different reasons (violates SRP) |
| 11 | **Shotgun Surgery** | A single change requires edits scattered across many classes |
| 12 | **Parallel Inheritance Hierarchies** | Creating a subclass of one class forces creating a subclass of another |

## Dispensables

| # | Smell | Description |
|---|-------|-------------|
| 13 | **Comments** | Code needs excessive comments to be understood |
| 14 | **Duplicated Code** | Identical or very similar code in more than one place |
| 15 | **Lazy Element** | A class/function that doesn't do enough to justify its existence |
| 16 | **Data Class** | Classes with only fields, getters, setters — no behavior |
| 17 | **Dead Code** | Variables, parameters, fields, methods, or classes no longer used |
| 18 | **Speculative Generality** | Code created "just in case" for a future need that never materializes |

## Couplers

| # | Smell | Description |
|---|-------|-------------|
| 19 | **Feature Envy** | A method accesses another object's data more than its own |
| 20 | **Insider Trading** | Classes that spend too much time in each other's private parts |
| 21 | **Message Chains** | Long chains of `getThis().getThat().getOther()` |
| 22 | **Middle Man** | A class whose only action is delegating to another class |
| 23 | **Incomplete Library Class** | Library doesn't provide a needed feature |

## New in 2nd Edition

| # | Smell | Description |
|---|-------|-------------|
| 24 | **Mysterious Name** | Names that don't clearly communicate purpose |
| 25 | **Global Data** | Data modifiable from anywhere in the codebase |
| 26 | **Mutable Data** | Data changed in place, leading to unexpected consequences |
| 27 | **Loops** | Legacy iteration that could be replaced with pipeline operations (map/filter/reduce) |

## Naming Changes (1st → 2nd Edition)

- Long Method → **Long Function**
- Lazy Class → **Lazy Element**
- Inappropriate Intimacy → **Insider Trading**
- Switch Statements → **Repeated Switches**
