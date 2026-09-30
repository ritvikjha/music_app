# Duel state persistence

The sync server saves each started online duel as JSON and reloads it when the process starts. Locally, the default file is `server/data/duel-state.json` (override it with `DUEL_STATE_FILE`). The file is intentionally ignored by Git.

The Fly.io config mounts a volume at `/data`, so match snapshots survive a machine restart or image deploy. Before the first deploy with this mount, create its volume in the configured region:

```sh
fly volumes create jam_data --region iad --size 1 --app music-app-sync
```

Keep the sync service on one machine unless state is moved to a shared database. A Fly volume belongs to one machine and is not shared between replicas.
