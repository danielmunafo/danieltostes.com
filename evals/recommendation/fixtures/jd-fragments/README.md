# Recommendation JD Fixtures

Each `REC-XX-<name>.txt` file contains a full (or near-full) job description. Unlike the hard-gate fragments which are minimal, these are realistic JDs that drive the complete evaluator → hard-gate → pitch flow.

The recommendation test runner pipes the full JD through all stages and checks the final pitch output for recommendation label, technical fit score, and pitch body content.
