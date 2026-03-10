# ATLAS Chaos Engineering Gameday Runbook

## Pre-Checks
- [ ] All services healthy (`kubectl get pods -A | grep -v Running`)
- [ ] No active incidents or deployments
- [ ] Monitoring dashboards accessible
- [ ] Team notified in #atlas-chaos Slack channel
- [ ] Rollback procedures reviewed

## Experiments

### Weekly: Random Pod Kills
```bash
kubectl apply -f chaos/experiments/pod-delete-gateway.yaml
# Expected: LB routes to healthy pods, <5s recovery
# Verify: curl -s api-gateway:8080/health returns 200
```

### Monthly: Network Partition
```bash
kubectl apply -f chaos/experiments/network-partition-iam.yaml
# Expected: IAM uses cached auth, graceful degradation
# Verify: Login still works with cached tokens
```

### Monthly: Kafka Broker Kill
```bash
kubectl apply -f chaos/experiments/kafka-broker-kill.yaml
# Expected: Producers retry, no data loss, <10s failover
# Verify: Check consumer lag after recovery
```

### Monthly: Redis Failure
```bash
kubectl apply -f chaos/experiments/redis-failure.yaml
# Expected: Gateway falls back to DB, <5s detection
# Verify: API still responds (higher latency acceptable)
```

### Quarterly: CPU Stress + HPA
```bash
kubectl apply -f chaos/experiments/cpu-stress-risk.yaml
# Expected: HPA scales up within 60s, latency <2x
# Verify: kubectl get hpa -n atlas-intel
```

## Rollback
```bash
kubectl delete chaosengine --all -A
kubectl rollout restart deployment -n atlas-gateway
kubectl rollout restart deployment -n atlas-core
```

## Post-Mortem Template
1. What happened?
2. What was the expected behavior?
3. What was the actual behavior?
4. Recovery time?
5. Action items for improvement?
