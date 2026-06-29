# SLURM Script Builder

A fast browser-based SLURM script generator for people who would rather not
write every directive by hand. Everything runs on the client; it does not
connect to or submit jobs to a cluster. The generated script can be reviewed,
copied, or downloaded before it is submitted with `sbatch`.

## Install and run

You need Git, Python 3, and a modern web browser. Node.js is only required to
use the `npm` convenience commands or run the tests.

Clone the repository:

```bash
git clone https://github.com/UniKuX/slrum_script_generator.git
cd slrum_script_generator
```

Start the local web server:

```bash
npm run dev
```

Then open <http://localhost:8080> in your browser.

There are no third-party dependencies, so `npm install` is not required. If
Node.js is unavailable, start the same server directly:

```bash
python3 -m http.server 8080
```

## Use the generator

1. Enter the partition, time limit, memory, and compute resources.
2. Optionally enter modules, a Conda installation path, and an environment.
3. Enter the command the job should run.
4. Review the live preview, then copy or download the script.
5. Submit the downloaded script on the HPC login node:

```bash
sbatch my-job.sh
```

The output fields support SLURM filename patterns such as `%x-%j.out`, where
`%x` is the job name and `%j` is the job ID. Create any output directory before
submitting the job.

### Personal Conda installation

For Anaconda, Miniconda, or Miniforge installed in your HPC user space, enter
the installation's base directory rather than the `conda` executable. For
example:

```text
Conda installation path: /scratch/users/username/miniforge3
Conda environment: analysis
```

The generated script will source
`/scratch/users/username/miniforge3/etc/profile.d/conda.sh` before activating
the selected environment.

## Test

```bash
npm test
```

The form distinguishes nodes, tasks, and CPUs per task and supports optional
GPU types, node lists, modules, and Conda environments.
