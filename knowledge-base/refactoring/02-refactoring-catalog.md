# Refactoring: Complete Catalog (Fowler 2nd Edition)

## A. Basic Refactorings (Ch.6 — "The Most Important")

| # | Refactoring | Description |
|---|------------|-------------|
| 1 | **Extract Function** | Turn a code fragment into a function with a descriptive name |
| 2 | **Inline Function** | Replace a function call with its body when the body is as clear as the name |
| 3 | **Extract Variable** | Introduce a local variable for a complex expression |
| 4 | **Inline Variable** | Replace a variable with the expression when it adds no clarity |
| 5 | **Change Function Declaration** | Rename function or change its parameters |
| 6 | **Encapsulate Variable** | Wrap data access behind functions |
| 7 | **Rename Variable** | Give a variable a name that communicates its purpose |
| 8 | **Introduce Parameter Object** | Replace groups of parameters with a single object |
| 9 | **Combine Functions into Class** | Group functions operating on the same data into a class |
| 10 | **Combine Functions into Transform** | Gather derived computations into a transforming function |
| 11 | **Split Phase** | Separate code dealing with two things into sequential phases |

## B. Encapsulation (Ch.7)

| # | Refactoring | Description |
|---|------------|-------------|
| 12 | **Encapsulate Record** | Replace a record with a class controlling access |
| 13 | **Encapsulate Collection** | Return a copy or read-only proxy of a collection |
| 14 | **Replace Primitive with Object** | Wrap a primitive in a class adding behavior and meaning |
| 15 | **Replace Temp with Query** | Extract expression into a function; replace the temp |
| 16 | **Extract Class** | Split a class that does too much into two |
| 17 | **Inline Class** | Merge a class that does too little into another |
| 18 | **Hide Delegate** | Create a method on server to hide delegate from client |
| 19 | **Remove Middle Man** | Let client call delegate directly |
| 20 | **Substitute Algorithm** | Replace function body with a clearer algorithm |

## C. Moving Features (Ch.8)

| # | Refactoring | Description |
|---|------------|-------------|
| 21 | **Move Function** | Move to the module where it is most referenced |
| 22 | **Move Field** | Move to the class where it is most used |
| 23 | **Move Statements into Function** | Move statements that always accompany a call into the function |
| 24 | **Move Statements to Callers** | Move behavior out when different callers need different behavior |
| 25 | **Replace Inline Code with Function Call** | Replace inline code with existing function |
| 26 | **Slide Statements** | Move related code lines next to each other |
| 27 | **Split Loop** | Split a loop doing two things into two loops |
| 28 | **Replace Loop with Pipeline** | Replace loop with map/filter/reduce pipeline |
| 29 | **Remove Dead Code** | Delete unreachable or unused code |

## D. Organizing Data (Ch.9)

| # | Refactoring | Description |
|---|------------|-------------|
| 30 | **Split Variable** | Create separate variables when one is assigned for two purposes |
| 31 | **Rename Field** | Give a field a better descriptive name |
| 32 | **Replace Derived Variable with Query** | Remove a variable that can be computed |
| 33 | **Change Reference to Value** | Treat reference object as value object |
| 34 | **Change Value to Reference** | Replace copies with a shared reference |

## E. Simplifying Conditional Logic (Ch.10)

| # | Refactoring | Description |
|---|------------|-------------|
| 35 | **Decompose Conditional** | Extract complex conditional tests and branches into named functions |
| 36 | **Consolidate Conditional Expression** | Combine conditions yielding the same result |
| 37 | **Replace Nested Conditional with Guard Clauses** | Replace nesting with early returns |
| 38 | **Replace Conditional with Polymorphism** | Replace type-based conditional with polymorphic dispatch |
| 39 | **Introduce Special Case** | Create subclass/object for a common special case (Null Object) |
| 40 | **Introduce Assertion** | Make assumptions about program state explicit |

## F. Refactoring APIs (Ch.11)

| # | Refactoring | Description |
|---|------------|-------------|
| 41 | **Separate Query from Modifier** | Split function returning value with side effects into two |
| 42 | **Parameterize Function** | Merge similar functions differing only in literal values |
| 43 | **Remove Flag Argument** | Replace boolean parameter with separate explicit functions |
| 44 | **Preserve Whole Object** | Pass whole object instead of pulling values individually |
| 45 | **Replace Parameter with Query** | Remove parameter; have function compute value itself |
| 46 | **Replace Query with Parameter** | Move dependency out of function as a parameter |
| 47 | **Remove Setting Method** | Remove setter; set only in constructor |
| 48 | **Replace Constructor with Factory Function** | More flexible creation |
| 49 | **Replace Function with Command** | Wrap function in command object |
| 50 | **Replace Command with Function** | Simplify command back into a function |

## G. Dealing with Inheritance (Ch.12)

| # | Refactoring | Description |
|---|------------|-------------|
| 51 | **Pull Up Method** | Move identical methods from subclasses to superclass |
| 52 | **Pull Up Field** | Move identical fields to superclass |
| 53 | **Pull Up Constructor Body** | Extract common constructor code to superclass |
| 54 | **Push Down Method** | Move method to specific subclass(es) that need it |
| 55 | **Push Down Field** | Move field to specific subclass(es) that use it |
| 56 | **Replace Type Code with Subclasses** | Replace type code with actual subclasses |
| 57 | **Remove Subclass** | Replace subclass with field in superclass |
| 58 | **Extract Superclass** | Pull common behavior into new superclass |
| 59 | **Collapse Hierarchy** | Merge superclass and subclass that are too similar |
| 60 | **Replace Subclass with Delegate** | Replace inheritance with delegation |
| 61 | **Replace Superclass with Delegate** | Replace inheritance where subclass doesn't truly specialize |

## H. Additional (Web Edition / 1st Edition)

| # | Refactoring | Description |
|---|------------|-------------|
| 62 | **Replace Magic Literal** | Replace magic number/string with named constant |
| 63 | **Return Modified Value** | Return modified value instead of modifying a parameter |
| 64 | **Replace Error Code with Exception** | Use exceptions instead of error return codes |
| 65 | **Replace Exception with Precheck** | Use conditional test before the call |
| 66 | **Replace Control Flag with Break** | Replace control flag with break/return/continue |
