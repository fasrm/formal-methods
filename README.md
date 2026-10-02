# Formal Methods

Estudos de métodos formais aplicados à segurança da informação.

## Verificação de inserção textual no DOM

O estudo em [xss-1](./xss-1/) analisa o uso de `textContent`
para exibir uma entrada como texto em um parágrafo HTML.

Inclui modelo SMT-LIB, testes com Playwright, corpus de entradas,
resultados registrados e documento de pesquisa.

- [Documento de pesquisa](./xss-1/pesquisa-verificacao-formal-xss.docx)
- [Relatório](./xss-1/relatorio-verificacao-xss.md)
- [Modelo formal](./xss-1/modelo.smt2)
- [Resultados do corpus](./xss-1/resultados-blns.json)

Foram relatados 515/515 casos aprovados no Chromium.
A garantia formal depende das hipóteses e do contexto definidos
no documento; os testes complementam a análise.

## Executar os testes

```powershell
cd xss-1
npm ci
npx playwright install chromium
node .\teste-texto.cjs
```

A execução atualiza o arquivo de resultados utilizado pelo executor.

## Autor

Franciny Rojas
