const { chromium } = require("playwright");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { readFileSync, writeFileSync } = require("node:fs");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");

(async () => {
  const htmlPath = resolve(__dirname, "exemplo.html");
  const corpusPath = resolve(__dirname, "blns.json");
  const saidaPath = resolve(__dirname, "resultados-blns.json");

  const htmlBytes = readFileSync(htmlPath);
  const corpusBytes = readFileSync(corpusPath);
  const entradas = JSON.parse(corpusBytes.toString("utf8"));

  assert.ok(
    Array.isArray(entradas) &&
      entradas.length > 0 &&
      entradas.every(entrada => typeof entrada === "string"),
    "blns.json precisa conter uma lista não vazia de strings."
  );

  const hash = bytes =>
    createHash("sha256").update(bytes).digest("hex");

  const browser = await chromium.launch();

  const relatorio = {
    dataUTC: new Date().toISOString(),
    chromium: browser.version(),
    htmlSHA256: hash(htmlBytes),
    corpusSHA256: hash(corpusBytes),
    total: entradas.length,
    aprovados: 0,
    entradasAlteradasPeloCampo: 0,
    casos: []
  };

  try {
    const page = await browser.newPage();
    const erros = [];
    const dialogos = [];

    page.on("pageerror", erro => {
      erros.push(erro.message);
    });

    page.on("console", mensagem => {
      if (["assert", "error"].includes(mensagem.type())) {
        erros.push(mensagem.text());
      }
    });

    page.on("dialog", async dialogo => {
      dialogos.push(dialogo.message());
      await dialogo.dismiss();
    });

    await page.goto(pathToFileURL(htmlPath).href);

    assert.deepEqual(erros, [], "Erro ao carregar a página.");
    assert.deepEqual(dialogos, [], "Diálogo ao carregar a página.");

    for (const [indice, entrada] of entradas.entries()) {
      const caso = {
        numero: indice + 1,
        entrada,
        passou: false
      };

      const inicioErros = erros.length;
      const inicioDialogos = dialogos.length;

      try {
        await page.locator("#nome").fill(entrada);

        // O input pode normalizar alguns caracteres.
        const valorLido = await page.locator("#nome").inputValue();

        caso.valorLido = valorLido;
        caso.entradaAlteradaPeloCampo = valorLido !== entrada;

        if (caso.entradaAlteradaPeloCampo) {
          relatorio.entradasAlteradasPeloCampo++;
        }

        await page.locator("#mostrar").click();

        const observado = await page.locator("#resultado").evaluate(
          elemento => ({
            texto: elemento.textContent,
            elementosFilhos: elemento.children.length
          })
        );

        caso.observado = observado;

        assert.equal(
          observado.texto,
          `Olá, ${valorLido}!`,
          "O resultado não corresponde ao valor lido do campo."
        );

        assert.equal(
          observado.elementosFilhos,
          0,
          "Foram criados elementos HTML no resultado."
        );

        assert.deepEqual(
          erros.slice(inicioErros),
          [],
          "Foram registrados erros no navegador."
        );

        assert.deepEqual(
          dialogos.slice(inicioDialogos),
          [],
          "Foi registrado um diálogo inesperado."
        );

        caso.passou = true;
        relatorio.aprovados++;

        console.log(`Caso ${caso.numero}: PASSOU`);
      } catch (erro) {
        caso.erro = erro.message;
        console.error(`Caso ${caso.numero}: FALHOU`);
        console.error(erro.message);
      }

      caso.errosNavegador = erros.slice(inicioErros);
      caso.dialogos = dialogos.slice(inicioDialogos);

      relatorio.casos.push(caso);
    }
  } catch (erro) {
    relatorio.erroGeral = erro.message;
    console.error("Erro geral:", erro.message);
    process.exitCode = 1;
  } finally {
    try {
      writeFileSync(
        saidaPath,
        JSON.stringify(relatorio, null, 2),
        "utf8"
      );
    } finally {
      await browser.close();
    }
  }

  console.log(
    `\nAprovados: ${relatorio.aprovados}/${relatorio.total}`
  );

  console.log(
    "Entradas alteradas pelo campo:",
    relatorio.entradasAlteradasPeloCampo
  );

  console.log("Chromium:", relatorio.chromium);
  console.log("Relatório salvo em resultados-blns.json");

  if (relatorio.aprovados !== relatorio.total) {
    process.exitCode = 1;
  }
})().catch(erro => {
  console.error("FALHOU:", erro);
  process.exitCode = 1;
});