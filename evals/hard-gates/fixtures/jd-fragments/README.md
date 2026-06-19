# JD Fragment Fixtures

Each `HG-XX-<name>.txt` file contains the job description text fed to the hard-gate extractor (`generateObject`) for that test case.

These are minimal JD fragments — just enough text to trigger the expected gate categories. They are intentionally shorter than real JDs to keep the extraction focused on the requirement being tested.

## Naming

`HG-{test_id}-{short-descriptor}.txt`

## Usage

The test runner reads the JD text from the file and passes it as the user message to the hard-gate extraction stage. The extracted rows are then passed to `computeHardGateAssessment` and the result is compared against `expected_gate_rows`, `expected_max_technical_fit_lte`, and `blocked_recommendations` from `cases.json`.
