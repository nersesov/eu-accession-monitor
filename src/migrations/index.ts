import * as migration_20261121_235610_initial from './20261121_235610_initial';
import * as migration_20261122_000000_audit_log_immutable from './20261122_000000_audit_log_immutable';

export const migrations = [
  {
    up: migration_20261121_235610_initial.up,
    down: migration_20261121_235610_initial.down,
    name: '20261121_235610_initial'
  },
  {
    up: migration_20261122_000000_audit_log_immutable.up,
    down: migration_20261122_000000_audit_log_immutable.down,
    name: '20261122_000000_audit_log_immutable'
  },
];
