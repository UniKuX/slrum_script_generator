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
