import { readFileSync, writeFileSync } from "node:fs";

const shellPath = process.env.RAKAZO_SHELL_PATH ?? "/app/apps/web/src/pages/Shell.tsx";
let source = readFileSync(shellPath, "utf8");

function replaceOnce(before, after) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error("Rakazo Workforce UI patch target is missing or ambiguous");
  }
  source = source.replace(before, after);
}

replaceOnce(
  `  }, [panel, computerOpen, active?.id, computer?.state]);

  async function openComputer() {`,
  `  }, [panel, computerOpen, active?.id, computer?.state]);

  useEffect(() => {
    if (panel !== "computer" || usage) return;
    void rpc.usage
      .summary()
      .then(setUsage)
      .catch(() => undefined);
  }, [panel, usage]);

  async function openComputer() {`,
);

replaceOnce(
  `            {panel === "computer" && active ? (
              <div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-[#0E0E10]">`,
  `            {panel === "computer" && active ? (
              <div>
                <div className="mb-3 rounded-[14px] border border-[#242428] bg-[#111113] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13.5px] font-medium text-[#ECECEE]">
                      <Trans>Ekvaar Computer</Trans>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-[#9A9AA0]">
                      <span
                        className={\`h-1.5 w-1.5 rounded-full \${
                          computer?.state === "running"
                            ? "bg-[#4ADE80]"
                            : computer?.state === "booting" || booting
                              ? "bg-[#F6C453]"
                              : computer?.state === "error"
                                ? "bg-[#F87171]"
                                : "bg-[#6C6C70]"
                        }\`}
                      />
                      {computer?.state === "running" ? (
                        <Trans>Ready</Trans>
                      ) : computer?.state === "booting" || booting ? (
                        <Trans>Starting</Trans>
                      ) : computer?.state === "error" ? (
                        <Trans>Needs attention</Trans>
                      ) : (
                        <Trans>Stopped</Trans>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-[1.45] text-[#85858A]">
                    <Trans>
                      A private browser, terminal, and file workspace for this agent. Use it for
                      web tasks, repeatable routines, and work that needs visible proof.
                    </Trans>
                  </p>
                  {usage ? (
                    <p className="mt-2 text-[11.5px] text-[#6C6C70]">
                      <Trans>
                        {usage.runs} runs · {usage.inputTokens + usage.outputTokens} tokens used
                      </Trans>
                    </p>
                  ) : null}
                </div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-[#0E0E10]">`,
);

replaceOnce("                        ? computerError", "                        ? t`Computer service needs attention`");

replaceOnce(
  `                </div>
                {computer?.state === "error" ||`,
  `                </div>
                {computerError ? (
                  <details className="mt-2 rounded-[11px] border border-[#402728] bg-[#1B1112] px-3 py-2.5">
                    <summary className="cursor-pointer text-[12.5px] text-[#F0A7A7]">
                      <Trans>Why this failed</Trans>
                    </summary>
                    <p className="mt-2 text-[12px] leading-[1.45] text-[#B98E90]">
                      <Trans>
                        The computer could not start. Try Recover computer once. If it still fails,
                        the workspace administrator can use the technical detail below.
                      </Trans>
                    </p>
                    <code className="mt-2 block break-words text-[10.5px] text-[#8F7476]">
                      {computerError}
                    </code>
                  </details>
                ) : null}
                {computer?.state === "error" ||`,
);

writeFileSync(shellPath, source);
