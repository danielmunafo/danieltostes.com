# Reference Pitch Fixtures

Each `REF-XX-<name>.md` file contains a simulated pitch response (the assistant text after the `[[THINKING_END]]` marker) used as input to the references stage.

Using fixture pitch text isolates the references test from the upstream stages. You can test claim extraction, embedding, and chunk matching without running a full pipeline.

## Creating a fixture

1. Run the full pipeline for a suitable JD.
2. Extract the text between `[[THINKING_END]]` and the end of the pitch stream.
3. Save as `REF-XX-<descriptor>.md`.
4. Commit alongside the case definition.

The fixture should contain at least one claim that clearly matches the expected chunk (for positive tests) or clearly does not match anything in the corpus (for negative tests like REF-03 and REF-06).
