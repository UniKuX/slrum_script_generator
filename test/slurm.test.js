import assert from "node:assert/strict";
import test from "node:test";

import { generateScript, scriptFilename } from "../src/slurm.js";

const baseJob = {
  jobName: "training",
  partition: "gpu",
  timeLimit: "01:30:00",
  memory: "32G",
  nodes: "1",
  tasks: "2",
  cpusPerTask: "4",
  gpus: "0",
  gpuType: "",
  nodeList: "",
  modules: "python/3.11",
  condaBasePath: "",
  condaEnvironment: "",
  command: "python train.py",
  output: "%x-%j.out",
  error: "%x-%j.err",
};

test("generates core directives and environment commands", () => {
  const script = generateScript(baseJob);

  assert.match(script, /^#!\/bin\/bash/);
  assert.match(script, /#SBATCH --partition=gpu/);
  assert.match(script, /#SBATCH --ntasks=2/);
  assert.match(script, /#SBATCH --cpus-per-task=4/);
  assert.match(script, /module load python\/3\.11/);
  assert.match(script, /set -eo pipefail/);
  assert.match(script, /\nset -u\n/);
  assert.match(script, /python train\.py/);
  assert.doesNotMatch(script, /--gres/);
});

test("adds typed GPUs and a node list when requested", () => {
  const script = generateScript({
    ...baseJob,
    gpus: "2",
    gpuType: "a100",
    nodeList: "node[01-02]",
  });

  assert.match(script, /#SBATCH --gres=gpu:a100:2/);
  assert.match(script, /#SBATCH --nodelist=node\[01-02\]/);
});

test("initializes and activates a named Conda environment", () => {
  const script = generateScript({
    ...baseJob,
    modules: "miniconda cuda/12.1",
    condaEnvironment: "pytorch",
  });

  assert.ok(script.indexOf("module load miniconda cuda/12.1") < script.indexOf("conda activate"));
  assert.ok(script.indexOf("conda activate") < script.indexOf("set -u"));
  assert.match(script, /eval "\$\(conda shell\.bash hook\)"/);
  assert.match(script, /conda activate 'pytorch'/);
});

test("safely quotes a Conda environment path", () => {
  const script = generateScript({
    ...baseJob,
    condaEnvironment: "/work/team's envs/pytorch",
  });

  assert.match(script, /conda activate '\/work\/team'"'"'s envs\/pytorch'/);
});

test("initializes Conda from a user-provided installation", () => {
  const script = generateScript({
    ...baseJob,
    condaBasePath: "/home/user/anaconda3/",
    condaEnvironment: "analysis",
  });

  assert.match(
    script,
    /source '\/home\/user\/anaconda3\/etc\/profile\.d\/conda\.sh'/,
  );
  assert.match(script, /conda activate 'analysis'/);
  assert.doesNotMatch(script, /conda shell\.bash hook/);
});

test("requires an absolute Conda installation path", () => {
  assert.throws(
    () => generateScript({
      ...baseJob,
      condaBasePath: "~/anaconda3",
      condaEnvironment: "analysis",
    }),
    /absolute path starting with/,
  );
});

test("requires an environment with a Conda installation path", () => {
  assert.throws(
    () => generateScript({ ...baseJob, condaBasePath: "/home/user/anaconda3" }),
    /Choose a Conda environment/,
  );
});

test("rejects multiline directive injection", () => {
  assert.throws(
    () => generateScript({ ...baseJob, partition: "gpu\n#SBATCH --exclusive" }),
    /partition must fit on one line/,
  );
});

test("rejects a multiline Conda environment", () => {
  assert.throws(
    () => generateScript({ ...baseJob, condaEnvironment: "pytorch\necho unsafe" }),
    /condaEnvironment must fit on one line/,
  );
});

test("requires a GPU count when a type is selected", () => {
  assert.throws(
    () => generateScript({ ...baseJob, gpuType: "a100" }),
    /GPU count above zero/,
  );
});

test("creates a shell-safe filename", () => {
  assert.equal(scriptFilename("my job/name"), "my-job-name.sh");
});
