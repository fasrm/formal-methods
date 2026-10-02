# Verificação da inserção textual de uma entrada

Data: 2 de outubro de 2026. Estudo técnico do código fornecido por Franciny Rojas. Este documento registra uma análise delimitada; não constitui certificação independente de segurança.

## Conclusão

No código abaixo, o valor do campo é inserido como texto no parágrafo. Sob a semântica correta das APIs do navegador, não cria elementos HTML por essa operação. O modelo simplificado em Z3 verifica essa consequência para uma entrada arbitrária e um estado anterior arbitrário. Não há análise automática do código-fonte nem prova da implementação do navegador.

## Código de referência consolidado

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Exemplo de prevenção de XSS</title>
</head>
<body>
  <h1>Exibir conteúdo como texto</h1>

  <label for="nome">Digite seu nome:</label>
  <input id="nome" type="text">
  <button id="mostrar">Mostrar</button>

  <p id="resultado"></p>

<script>
  const entrada = document.getElementById("nome");
  const resultado = document.getElementById("resultado");
  const botao = document.getElementById("mostrar");

  console.assert(
    resultado instanceof HTMLParagraphElement,
    "O destino não é um parágrafo."
  );

  console.assert(
    document.querySelectorAll("#resultado").length === 1,
    "O identificador resultado não é único."
  );

  botao.addEventListener("click", () => {
    const nome = entrada.value;

    // O navegador trata o conteúdo como texto.
    resultado.textContent = `Olá, ${nome}!`;

    console.assert(
      resultado.textContent === `Olá, ${nome}!`,
      "Erro: o texto exibido foi alterado."
    );

    console.assert(
      resultado.children.length === 0,
      "Erro: foram encontrados elementos HTML filhos."
    );

    console.log("Verificações executadas.");
  });
</script>
</body>
</html>
```

## Propriedade e hipóteses

Após cada execução normal do callback, resultado.textContent é a saudação da entrada lida naquele clique e resultado.children.length é zero.

Hipóteses: documento conforme o código consolidado; identificadores únicos e elementos presentes; APIs padrão sem substituições; navegador conforme à semântica DOM; ausência de outros scripts, extensões ou mutações externas interferindo; execução concluída sem falhas de recursos. A prova é de correção parcial, não de disponibilidade nem de término sob recursos finitos.

O texto não é sanitizado para usos posteriores. A garantia refere-se à atribuição a textContent nesse elemento p. Não se aplica automaticamente a URLs, scripts, atributos ou innerHTML.

## Correspondência manual com o código

| Operação no JavaScript | Abstração |
|---|---|
| entrada.value | Entrada textual arbitrária |
| Template literal | Concatenação de prefixo, entrada e sufixo |
| resultado.textContent = ... | Substituição por nó Texto |
| console.assert e console.log | Sem alteração do parágrafo |

O estado No representa uma abstração do conteúdo do parágrafo, não todo o DOM. O estado anterior não é usado na atualização porque a operação substitui os filhos. Uma string SMT é uma abstração textual: não modelamos fielmente todas as particularidades de UTF-16 do JavaScript. A conclusão estrutural de não criar HTML independe dos caracteres; a igualdade textual no navegador decorre da cópia da string conforme à semântica da API.

## Modelo reproduzível

O bloco abaixo transcreve o arquivo modelo.smt2 conferido. As quebras de linha da transcrição não preservam os bytes originais; os hashes se referem aos anexos originais, não aos blocos deste relatório.

```lisp
; Tipos de conteúdo do parágrafo.
(declare-datatypes ()
  ((No
    (Vazio)
    (Texto (conteudo String))
    (Elemento (tag String))
  ))
)

; Estado anterior e entrada quaisquer.
(declare-const antes No)
(declare-const nome String)

; Modelo da substituição por textContent.
(define-fun atualizar ((anterior No) (entrada String)) No
  (Texto (str.++ "Olá, " entrada "!"))
)

(define-fun depois () No
  (atualizar antes nome)
)

(define-fun quantidadeElementos ((n No)) Int
  (ite ((_ is Elemento) n) 1 0)
)

; 1. As definições são consistentes?
(check-sat)

; 2. Existe alguma violação da propriedade?
(assert
  (or
    (not ((_ is Texto) depois))
    (> (quantidadeElementos depois) 0)
    (not (= (conteudo depois)
            (str.++ "Olá, " nome "!")))
  )
)

(check-sat)
```

Reprodução: carregar o arquivo original no editor Z3 e executar. Em uma instalação local compatível, executar `z3 modelo.smt2`. Resultados informados pelo usuário: `sat` seguido de `unsat`. Para consultar a versão sem modificar o arquivo identificado, executar `(get-info :version)` no editor.

## Argumento sobre cliques repetidos

Base: o parágrafo inicial não tem elementos filhos. Passo: a atualização produz texto e zero elementos, independentemente do estado anterior. As instruções seguintes preservam esse estado. Por indução manual, a propriedade vale após qualquer sequência finita de callbacks concluídos normalmente. O Z3 verifica o passo abstrato; a indução e a correspondência com os eventos do navegador foram justificadas manualmente.

## Evidências e controle de validação

| Evidência | Origem e situação |
|---|---|
| Código HTML | Anexo lido diretamente e comparado ao código discutido |
| Modelo SMT-LIB | Anexo lido diretamente; contém as duas consultas usadas |
| Hashes SHA-256 | Recalculados diretamente nos dois anexos; coincidem com os valores do PowerShell |
| Consistência | Usuário informou `sat` no editor |
| Negação da propriedade | Usuário informou `unsat` no editor |
| Versão do solver | Usuário informou `(:version "5.0.0")` |
| Teste na página | Usuário relatou tags exibidas literalmente e mensagem Verificações executadas |
| Controle de alteração do modelo | Usuário informou `sat` ao substituir Texto por Elemento |

Não houve reexecução independente do solver neste ambiente. A versão 5.0.0 é registrada como informada pelo editor do usuário, sem confirmação independente. As capturas anteriores não puderam ser lidas. A mensagem Verificações executadas, isoladamente, não comprova ausência de assertions falhos, pois console.assert não interrompe o callback. As condições estruturais foram também conferidas na leitura do HTML.

### Identificação dos arquivos originais

- exemplo.html — SHA-256: `7A22320C52216894A53E6E9FD7BE9F570156CA56F1606DF7543FE9FD6210E228`
- modelo.smt2 — SHA-256: `CA5815F8694105B422F0D5D95A06DB61BEAA4E50A15DB361B3B6B3D5E38BAE90`

Hashes identificam os bytes analisados; não são prova de segurança. Qualquer alteração exige rever sua correspondência com a conclusão.

O controle que troca Texto por Elemento mostra que a consulta detecta a violação estrutural introduzida. Não demonstra exploração XSS: criar um elemento strong não equivale a executar JavaScript.

## Limite técnico central

A semântica de textContent é uma premissa incorporada à função atualizar. Portanto, a verificação é pequena e direta: o Z3 demonstra consequências da abstração, não descobre nem valida a semântica DOM. Não foram analisados um sanitizador real, um parser HTML ou o código interno do navegador.

## Referências para reprodução e revisão

- Z3, editor: https://microsoft.github.io/z3guide/playground/Freeform%20Editing/
- Z3, validade por insatisfatibilidade da negação: https://microsoft.github.io/z3guide/docs/logic/propositional-logic/
- DOM Standard, textContent: https://dom.spec.whatwg.org/#dom-node-textcontent

## Teste de corpus na implementação real

O arquivo resultados-blns.json anexado foi lido e sua consistência interna conferida. Ele registra 515 casos numerados de 1 a 515, todos aprovados, no Chromium 153.0.8010.12. Em todos os registros, o texto observado é exatamente a saudação do valor lido, a contagem de elementos HTML filhos é zero, as listas de erros e diálogos estão vazias e a entrada coincide com o valor lido. O hash do HTML registrado coincide com o hash do anexo exemplo.html previamente recalculado.

- Execução registrada (UTC): `2026-10-02T14:23:30.793Z`.
- Corpus: Big List of Naughty Strings, arquivo blns.json baixado pelo usuário; 515 entradas.
- SHA-256 do corpus informado pelo executor: `b5edb4dffb234fa8b37c6353ec2cbd414ce721a03968d26343a7c276ab360f63`.
- SHA-256 de resultados-blns.json recalculado: `d021cb4c18ab8c7c78b6395dc9b00b95a32ae2490264980e042f39ab365d18ba`.
- Executor: Playwright 1.63.0, conforme instalação relatada pelo usuário.

Esta revisão confirma o conteúdo e a consistência do JSON, não constitui reexecução independente do navegador. O arquivo original blns.json e o executor final não foram anexados para conferência independente dos seus bytes. O hash do corpus é registrado como informado pelo executor. Os testes foram feitos por preenchimento e clique, com inspeção imediata do resultado e captura de erros e diálogos; não são instrumentação exaustiva de toda possível execução assíncrona de JavaScript.

O resultado complementa a análise com 515 observações bem-sucedidas. É teste de corpus, sem geração de novas entradas ou mutações; não é prova universal por testes. A conclusão formal delimitada e suas hipóteses permanecem as mesmas.

## Encerramento e manutenção

A análise delimitada está consolidada: revisão manual do código, correspondência com a abstração, resultados relatados de Z3, versão informada e identidade dos arquivos. Não há pendência para registrar essa conclusão condicionada. Uma reprodução independente do solver pode acrescentar evidência, mas não eliminar a hipótese sobre o navegador.

Conclusão final: para os bytes de exemplo.html identificados acima, sob as hipóteses declaradas e após cada callback concluído normalmente, a entrada lida é exibida na saudação como texto e não cria elementos HTML no parágrafo por essa inserção. O modelo Z3 sustenta a consequência abstrata; a correspondência com o JavaScript e a indução sobre cliques foram justificadas manualmente. Não se afirma sanitização universal da variável nem verificação automática do navegador.
