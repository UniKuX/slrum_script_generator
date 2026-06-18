# SLURM Script Builder

A fast browser-based SLURM script generator for people who would rather not
write every directive by hand. Everything runs on the client; it does not
connect to or submit jobs to a cluster.

## Run locally

```bash
npm run dev
```

Open <http://localhost:8080>. No package installation is required.

## Test

```bash
npm test
```

The form distinguishes nodes, tasks, and CPUs per task, supports optional GPU
types, node lists, modules, and Conda environments, and provides live preview,
copy, and download actions. Conda environments can be identified by name or by
absolute path; modules are loaded before the environment is activated.
