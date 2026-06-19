# Grounding Fixtures

Each `G-XX-<name>-chunks.json` file contains the portfolio chunks that should be injected into the evidence evaluator prompt for that test case.

Using injected chunks rather than live retrieval isolates the grounding test from retrieval quality — if retrieval changes, grounding tests still run against the same evidence.

## Schema

```json
[
  {
    "id": "en-distributed-systems-s0-p0",
    "text": "...",
    "metadata": {
      "locale": "en",
      "sectionId": "distributedSystems",
      "scrollTargetId": "distributed-systems",
      "title": "Distributed Systems",
      "category": "experience"
    }
  }
]
```

## Creating a fixture

1. Run the retrieval pipeline for the target query.
2. Copy the top-K chunks from the response log.
3. Save as `G-XX-<descriptor>-chunks.json`.
4. Commit alongside the case definition.
