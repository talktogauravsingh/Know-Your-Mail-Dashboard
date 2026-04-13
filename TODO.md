# Mail Tracker Optimization & Scalability Plan

**Objective**: Implement optimizations for performance (bulk ops, queries, tracking) and scalability (queues, caching, DB).

## Implementation Steps:

### Phase 1: Queue & Redis Setup (High Impact)
1. [ ] Install Redis & predis/predis
2. [ ] Update config/queue.php to use Redis default
3. [ ] Update .env.example with Redis vars
4. [ ] Optimize SendEmailJob.php (Redis counters, batching)

### Phase 2: Service Optimizations
5. [ ] Cache IpRotationService (Redis active IPs)
6. [ ] BulkImportService chunked transactions
7. [ ] IpWarmupService Redis integration

### Phase 3: DB & Caching
8. [ ] New migration: Indexes on send_logs/recipients
9. [ ] Optimize TrackingService (cached geo)
10. [ ] AnalysisController caching

### Phase 4: Monitoring & Scale
11. [ ] Supervisor config for queue workers
12. [ ] docker-compose.yml for scaling
13. [ ] Tests & load testing

**Current Progress**: Starting Phase 1.
**Completion Criteria**: Handle 100k+ recipients/day, <1s analytics queries.
