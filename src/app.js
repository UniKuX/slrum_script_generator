import { generateScript, scriptFilename } from "./slurm.js";

const form = document.querySelector("#job-form");
const output = document.querySelector("#script-output");
const errorBox = document.querySelector("#form-error");
const lineCount = document.querySelector("#line-count");
const actionStatus = document.querySelector("#action-status");

function readJob() {
  return Object.fromEntries(new FormData(form).entries());
}

function render() {
  try {
    const script = generateScript(readJob());
    output.textContent = script;
    lineCount.textContent = `${script.trimEnd().split("\n").length} lines`;
    errorBox.hidden = true;
    return script;
  } catch (error) {
    output.textContent = "# Complete the form to generate a valid script.";
    lineCount.textContent = "Needs attention";
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    return null;
  }
}

function showStatus(message) {
  actionStatus.textContent = message;
  window.clearTimeout(showStatus.timeout);
  showStatus.timeout = window.setTimeout(() => {
    actionStatus.textContent = "";
  }, 2500);
}

form.addEventListener("input", render);

document.querySelector("#reset-button").addEventListener("click", () => {
  form.reset();
  render();
});

document.querySelector("#copy-button").addEventListener("click", async () => {
  const script = render();
  if (!script) return;

  try {
    await navigator.clipboard.writeText(script);
    showStatus("Script copied to clipboard.");
  } catch {
    showStatus("Clipboard access was blocked by the browser.");
  }
});

document.querySelector("#download-button").addEventListener("click", () => {
  const job = readJob();
  const script = render();
  if (!script) return;

  const url = URL.createObjectURL(new Blob([script], { type: "text/x-shellscript" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = scriptFilename(job.jobName);
  anchor.click();
  URL.revokeObjectURL(url);
  showStatus(`Downloaded ${anchor.download}.`);
});

render();
