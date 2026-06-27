# Recruiter assistant CloudWatch operations

The recruiter assistant emits CloudWatch EMF metrics from
`src/tracing/requestTraceMetrics.ts` with this namespace:

- `DanielTostes/RecruiterAssistant`

Request metrics use dimensions:

- `service`
- `environment`
- `navLocale`
- `outcome`

Stage metrics use dimensions:

- `service`
- `environment`
- `navLocale`
- `stage`
- `outcome`

The runtime service dimension is `recruiter-api`. The `environment` dimension comes
from `RECRUITER_METRICS_ENVIRONMENT`; when that variable is unset, Lambda names
ending in `-dev` infer `dev`, other Lambda names infer `production`, and local
runs infer `local`.

## Generate dashboard and alarms

From `services/recruiter-assistant-api`:

```bash
npm run ops:cloudwatch -- \
  --environment production \
  --region "$AWS_REGION" \
  --output-dir /tmp/recruiter-cloudwatch-production \
  --alarm-action-arn "$RECRUITER_ALARM_ACTION_ARN"
```

`--alarm-action-arn` is optional and repeatable. Use an SNS topic ARN or another
CloudWatch alarm action from your account. When omitted, the generated alarms are
created with `ActionsEnabled: false` so thresholds can be reviewed before paging.

For dev, set the environment and names explicitly:

```bash
npm run ops:cloudwatch -- \
  --environment dev \
  --region "$AWS_REGION" \
  --dashboard-name RecruiterAssistant-dev \
  --alarm-prefix recruiter-assistant-dev \
  --output-dir /tmp/recruiter-cloudwatch-dev
```

## Install or update

The script prints the exact AWS CLI commands after it writes the artifacts. The
commands are safe to re-run; CloudWatch updates existing dashboards and alarms
with the same names.

```bash
aws cloudwatch put-dashboard \
  --dashboard-name RecruiterAssistant-production \
  --dashboard-body file:///tmp/recruiter-cloudwatch-production/dashboard-body.json

for alarm in /tmp/recruiter-cloudwatch-production/alarms/*.json; do
  aws cloudwatch put-metric-alarm --cli-input-json "file://$alarm"
done
```

No secrets or account-specific ARNs are committed. The only account-specific
value is the optional alarm action ARN supplied at generation time.

## Dashboard widgets

The generated dashboard includes:

- Requests, request errors, and error ratio.
- Request latency p95 and p50 using `RequestLatencyMs` by locale/outcome.
- Stage latency and stage errors grouped by `stage`.
- Prompt, completion, embedding, and total token sums.
- Estimated cost plus missing usage/cost counters.
- Retrieval returned chunks plus minimum and maximum similarity.

The dashboard uses CloudWatch Metrics Insights for rollups across
`navLocale`/`outcome` and CloudWatch search expressions for latency percentile
views.

## Generated alarms

Defaults are intentionally conservative starting points. Tune them after a week
of real traffic.

| Alarm                    | Metric/query                                          | Default threshold                |
| ------------------------ | ----------------------------------------------------- | -------------------------------- |
| Request error count      | `SUM(RequestErrorCount)`                              | `>= 1` for 2 of 3 periods        |
| Request latency average  | `AVG(RequestLatencyMs)`                               | `>= 15000 ms` for 2 of 3 periods |
| Missing usage count      | `SUM(UsageMissingCallCount)`                          | `>= 3` for 2 of 3 periods        |
| Missing cost count       | `SUM(CostMissingCallCount)`                           | `>= 3` for 2 of 3 periods        |
| Low returned chunks      | `AVG(RetrievalReturnedChunks)` on successful requests | `<= 10` for 2 of 3 periods       |
| Low retrieval similarity | `MIN(RetrievalSimilarityMin)` on successful requests  | `<= 0.2` for 2 of 3 periods      |

The dashboard shows request error ratio with `AVG(RequestErrorCount)` instead of
cross-query metric math so the widget stays deployable and renderable in the
CloudWatch console. The deployable alarm uses request error count because
CloudWatch Metrics Insights alarms accept a single query as the alarmed time
series. The latency alarm uses average latency for the same reason; if p95
paging is needed later, add a runtime rollup metric or create targeted
per-locale/per-outcome alarms after the traffic baseline is known.

## Runbook

### Dashboard is empty

1. Confirm the Lambda is receiving real chat requests, not only `OPTIONS`
   preflights.
2. In CloudWatch Logs, search the Lambda log group for `recruiter.metrics`.
3. Check that `RECRUITER_METRICS_ENVIRONMENT` matches the dashboard
   `--environment` value, or that the Lambda function name inference is expected.
4. Expand the dashboard time range. EMF extraction can lag behind logs briefly.

### Request error rate alarm

1. Open the stage error widget and identify the stage with the largest
   `StageErrorCount`.
2. Search `recruiter.trace` logs for matching failed requests and stage names.
3. Check recent deploys, OpenAI provider errors, CORS/origin changes, and S3
   retrieval/index availability.
4. If errors are isolated to input validation or off-topic refusals, adjust the
   alarm threshold rather than relaxing guards.

### High latency alarm

1. Compare request latency with the stage latency widget.
2. If retrieval latency or returned chunks changed, verify `LLAMAINDEX_INDEX_S3_URI`
   and the corpus index uploaded by CI.
3. If LLM stages dominate, check OpenAI provider health, model override
   `RECRUITER_CHAT_MODEL`, and token totals.
4. If latency rises only in production, compare Lambda memory, timeout, and
   reserved concurrency with dev.

### Missing usage or cost alarm

1. Missing usage means a provider call completed without token usage metadata.
   Check whether the affected stage is streaming or embedding related.
2. Missing cost usually means the model returned usage but the local estimator
   does not know that model price. Check `src/tracing/costEstimator.ts` before
   treating cost graphs as authoritative.
3. If a new model is intentional, update the estimator in the same PR as the
   model change and verify `CostMissingCallCount` returns to zero.

### Retrieval degradation alarm

1. Check whether `RetrievalReturnedChunks` dropped while request volume stayed
   stable.
2. Verify the embeddings bucket object, `LLAMAINDEX_INDEX_S3_URI`, and
   `RECRUITER_RETRIEVER_PROVIDER`.
3. Run `npm run eval:retrieval` from this service to compare expected retrieval
   cases against the current corpus.
4. If similarity dropped after content changes, rebuild and upload the
   LlamaIndex index.

## Remove artifacts

```bash
aws cloudwatch delete-dashboards \
  --dashboard-names RecruiterAssistant-production

aws cloudwatch delete-alarms \
  --alarm-names \
    recruiter-assistant-production-request-error-count \
    recruiter-assistant-production-request-latency-average \
    recruiter-assistant-production-missing-usage-count \
    recruiter-assistant-production-missing-cost-count \
    recruiter-assistant-production-retrieval-returned-chunks-low \
    recruiter-assistant-production-retrieval-similarity-min-low
```

## References

- [CloudWatch dashboard body structure](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html)
- [CloudWatch Metrics Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-querylanguage.html)
- [Create alarms on Metrics Insights queries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-alarm-create.html)
