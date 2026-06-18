const SINGLE_LINE_FIELDS = [
  "jobName",
  "partition",
  "timeLimit",
  "memory",
  "gpuType",
  "nodeList",
  "modules",
  "condaEnvironment",
  "output",
  "error",
];

function assertSingleLine(name, value) {
  if (/\r|\n/.test(value)) {
    throw new Error(`${name} must fit on one line.`);
  }
}

function positiveInteger(name, value, allowZero = false) {
  const number = Number(value);
  const lowerBound = allowZero ? 0 : 1;
  if (!Number.isInteger(number) || number < lowerBound) {
    throw new Error(`${name} must be ${allowZero ? "zero or a positive" : "a positive"} integer.`);
  }
  return number;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

export function validateJob(job) {
  for (const field of SINGLE_LINE_FIELDS) {
    assertSingleLine(field, String(job[field] ?? ""));
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(job.jobName)) {
    throw new Error("Job name may only contain letters, numbers, dots, dashes, and underscores.");
  }
  if (!job.partition.trim()) throw new Error("Partition is required.");
  if (!/^\d+(?:-\d+)?(?::\d{1,2}){1,2}$/.test(job.timeLimit)) {
    throw new Error("Time limit must use HH:MM:SS, MM:SS, or D-HH:MM:SS format.");
  }
  if (!/^\d+(?:\.\d+)?[KMGT]?(?:i?B)?$/i.test(job.memory)) {
    throw new Error("Memory must be a number with an optional unit, such as 8G.");
  }
  if (!job.output.trim() || !job.error.trim()) {
    throw new Error("Output and error paths are required.");
  }
  if (!job.command.trim()) throw new Error("Command is required.");

  positiveInteger("Nodes", job.nodes);
  positiveInteger("Tasks", job.tasks);
  positiveInteger("CPUs per task", job.cpusPerTask);
  const gpus = positiveInteger("GPUs", job.gpus, true);
  if (gpus === 0 && job.gpuType.trim()) {
    throw new Error("Set the GPU count above zero before choosing a GPU type.");
  }
}

export function generateScript(job) {
  validateJob(job);

  const directives = [
    ["job-name", job.jobName],
    ["partition", job.partition],
    ["time", job.timeLimit],
    ["nodes", job.nodes],
    ["ntasks", job.tasks],
    ["cpus-per-task", job.cpusPerTask],
    ["mem", job.memory],
    ["output", job.output],
    ["error", job.error],
  ];

  if (Number(job.gpus) > 0) {
    const gpu = job.gpuType.trim()
      ? `gpu:${job.gpuType.trim()}:${job.gpus}`
      : `gpu:${job.gpus}`;
    directives.push(["gres", gpu]);
  }
  if (job.nodeList.trim()) directives.push(["nodelist", job.nodeList.trim()]);

  const lines = [
    "#!/bin/bash",
    ...directives.map(([key, value]) => `#SBATCH --${key}=${value}`),
    "",
    "set -euo pipefail",
  ];

  const modules = job.modules.trim().split(/\s+/).filter(Boolean);
  if (modules.length) {
    lines.push("", "module purge", `module load ${modules.join(" ")}`);
  }

  const condaEnvironment = String(job.condaEnvironment ?? "").trim();
  if (condaEnvironment) {
    lines.push(
      "",
      "if ! command -v conda >/dev/null 2>&1; then",
      '  echo "Conda is not available. Load its module or add it to PATH." >&2',
      "  exit 1",
      "fi",
      'eval "$(conda shell.bash hook)"',
      `conda activate ${shellQuote(condaEnvironment)}`,
    );
  }

  lines.push("", job.command.trim(), "");
  return lines.join("\n");
}

export function scriptFilename(jobName) {
  const safeName = String(jobName || "slurm-job").replace(/[^A-Za-z0-9_.-]/g, "-");
  return `${safeName || "slurm-job"}.sh`;
}
