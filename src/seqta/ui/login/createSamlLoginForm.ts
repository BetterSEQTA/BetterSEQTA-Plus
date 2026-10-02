import type { SeqtaSamlConfig } from "@/seqta/utils/seqtaLoginShellConfig";

export function createSamlLoginForm(
  config: SeqtaSamlConfig,
  label = "Sign in with SSO",
): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "saml-form";
  form.method = config.method;
  form.action = config.url;

  const fields: Array<[string, string]> = [
    ["SAMLRequest", config.request],
    ["SigAlg", config.sigalg],
    ["Signature", config.signature],
  ];
  if (config.relaystate) {
    fields.push(["RelayState", decodeURIComponent(config.relaystate)]);
  }

  for (const [name, value] of fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "alt-button";
  button.textContent = config.label?.trim() || label;
  form.appendChild(button);

  return form;
}
