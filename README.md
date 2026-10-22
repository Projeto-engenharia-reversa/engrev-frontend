# engrev-frontend

Interface web do engrev, que recupera o modelo de dados relacional de um sistema
a partir do código-fonte.

O usuário cria um projeto, envia um `.zip` com o repositório e acompanha a
análise pela etapa atual e pelo percentual, que chegam por um fluxo de eventos do
servidor. No fim, o diagrama entidade-relacionamento, o script SQL e o parecer
técnico ficam em abas da mesma tela.

Angular 20 com TypeScript. O diagrama é renderizado pelo Mermaid.

A API está no repositório `engrev-backend` e precisa estar no ar.

## Rodar com Docker

O `docker-compose.yml` está no repositório do backend e sobe os dois. Clone os
dois no mesmo diretório:

```bash
git clone https://github.com/Projeto-engenharia-reversa/engrev-backend
git clone https://github.com/Projeto-engenharia-reversa/engrev-frontend
cd engrev-backend
cp .env.example .env
docker compose up -d --build
```

A interface fica em http://localhost.

## Rodar local

```bash
npm ci
npm start
```

Sobe em http://localhost:4200. As chamadas a `/api` e `/health` são encaminhadas
para `http://localhost:8000`, onde o backend precisa estar rodando. Para apontar
para outro endereço, defina `API_PROXY`.

```bash
npm run build     # build de produção em dist/engrev
npm run lint
```

Requer Node.js 24.

## nginx na imagem isolada

O `nginx.conf` encaminha `/api` para o host `backend`, nome do serviço no
`docker-compose.yml`. Fora dessa rede o nome não resolve, e usar a imagem sozinha
exige ajustar o `proxy_pass`.
