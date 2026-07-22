# ConectVet — Next.js

Protótipo convertido para Next.js 14 (App Router) + TypeScript + Tailwind.

## Rotas
- `/` — Login. Escolha "Sou Clínica" ou "Sou Profissional" antes de entrar; ao validar e-mail/senha, vai **direto para a plataforma** (não para o cadastro).
- `/clinica` — Shell da clínica: Home (feed), Criar/editar vaga, Painel (candidatos, pagamento retido/liberado, avaliação do profissional), Perfil.
- `/profissional` — Shell do profissional: Home (feed com candidatura e "perto de você"), Minhas candidaturas (com avaliação da clínica), Perfil.
- `/admin` — Painel administrativo: totais retido/liberado/taxa e lista de pagamentos com liberação manual.

## Rodar localmente
```
cd nextjs-export
npm install
npm run dev
```

## Observações
- Dados são mockados em `lib/mockData.ts` (sem backend).
- Cadastro de clínica/profissional não foi portado como tela própria neste pacote — o objetivo era isolar os 3 fluxos por rota; adicione `/clinica/cadastro` e `/profissional/cadastro` reaproveitando os padrões dos formulários já existentes se precisar do fluxo completo de onboarding.
- Cores aproximadas (`tailwind.config.ts`): primary `#63c94e` (verde), secondary `#2e8cad` (azul/teal).
