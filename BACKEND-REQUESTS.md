# Minerva AI Chat — Pedidos à equipa de backend

**Data:** 2026-06-12
**Backend em causa:** `https://uc-vortex.dev.ucframework.pt`

Contexto: o widget de chat (frontend) já está ligado ao backend real e funcional
de ponta a ponta. Durante a integração identificámos os pontos abaixo.

---

## 1. `retrieved_docs` estruturado 🟠 médio

Hoje `retrieved_docs` é um blob de texto formatado:

```
[1] Regulamento de Duração e Organização do Tempo de Trabalho da UC - 56.2020.pdf — Preâmbulo
    chunk_id=319516f5-…::chunk2 | index=2 | chars=1991
<texto integral do chunk…>

---

[2] …
```

O widget faz parsing com expressões regulares — frágil a qualquer mudança de
formato — e descarta o texto dos chunks (só mostramos nome/ secção).

**Pedido:** devolver um array JSON, por exemplo:

```json
"retrieved_docs": [
  {
    "index": 1,
    "filename": "Regulamento … 56.2020.pdf",
    "section": "Preâmbulo",
    "chunk_id": "319516f5-…::chunk2",
    "url": "https://alfresco.uc.pt/…"   // se existir
  }
]
```

O campo `url` (link) permitir-nos-ia tornar as
fontes clicáveis — atualmente o utilizador vê a citação mas não consegue
abrir o documento. 

## 2. Citações inline por índice do documento 🟠 médio

Hoje o modelo cita as fontes em texto livre e de forma inconsistente — por
vezes `[Fonte: <ficheiro>, <secção>]`, por vezes nada — e não existe ligação
determinística entre a citação no texto e a entrada correspondente de
`retrieved_docs`. O frontend só conseguiria correlacioná-las por matching de
nomes de ficheiro, o que é frágil.

**Pedido:** fazer o modelo citar pelo **índice** do excerto recuperado, no
formato `[N]`, imediatamente a seguir à afirmação que o excerto sustenta:

> O período normal de trabalho é de 7 horas por dia [1]. A adoção de horário
> flexível exige o cumprimento de duas plataformas fixas diárias [4].

Com isto, o widget passa a renderizar cada `[N]` como uma referência
clicável que abre/realça a fonte correspondente na lista "Sources", em vez
do texto de citação solto de hoje. Este ponto funciona em conjunto com o
ponto 1 (`retrieved_docs` estruturado): o `index` do array é a âncora que
liga a citação à fonte.

## 3. Código de erro estável no 404 de sessão 🟡 baixo

Sessão desconhecida devolve apenas texto humano:

```
HTTP 404 {"detail":"Sessao nao encontrada"}
```

O widget trata qualquer 404 deste endpoint como "sessão expirada" e recria a
thread — funciona, mas é impreciso (um 404 de routing teria o mesmo
tratamento).

**Pedido:** acrescentar um campo estável, p.ex.
`{"detail": "…", "code": "thread_not_found"}`.

## 4. Documentar o TTL das sessões 🟡 baixo

O widget guarda a conversa no dispositivo durante 24 h e reutiliza o
`thread_id`. Não sabemos quanto tempo o servidor retém a sessão/contexto.

**Pedido:** indicar o tempo de vida de uma thread no servidor (e idealmente
alinhá-lo com ≥ 24 h), e confirmar se o histórico da conversa é de facto
usado como contexto nas mensagens seguintes.

## 5. Endpoint `/health` 🟡 baixo

Quando o serviço está indisponível, o widget só descobre ao
fim de um timeout longo do primeiro pedido real.

**Pedido:** um `GET /health` (ou `/api/health`) leve e sem autenticação, que
responda em milissegundos. O widget poderá então falhar depressa com uma
mensagem amigável de "serviço indisponível", e o nosso proxy de
desenvolvimento poderá fazer o mesmo.

---

## Resumo de prioridades

| # | Pedido | Prioridade |
|---|--------|------------|
| 1 | `retrieved_docs` em JSON estruturado + URLs | 🟠 Médio |
| 2 | Citações inline por índice `[N]` na resposta | 🟠 Médio |
| 3 | `code` estável nos erros (p.ex. `thread_not_found`) | 🟡 Baixo |
| 4 | Documentar/alinhar TTL das sessões | 🟡 Baixo |
| 5 | Endpoint `/health` | 🟡 Baixo |

Qualquer dúvida ou para coordenar testes: bruno@ucframework.pt.
