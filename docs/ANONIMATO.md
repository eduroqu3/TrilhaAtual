# Anonimato por Arquitetura na Trilha

Este documento explica com transparência, clareza e honestidade técnica como funciona a proteção de identidade dos alunos na plataforma Trilha, detalhando o que é estritamente garantido pela arquitetura e quais são os limites objetivos dessa proteção.

---

## 1. Por que o anonimato é uma regra inegociável?

A Trilha foi concebida como uma ferramenta de **escuta pedagógica construtiva**, e não um instrumento de punição ou ranqueamento competitivo. Para que estudantes possam expressar percepções sinceras sobre a prática docente sem receio de represálias, o sistema adota a separação estrutural de dados no nível do banco de dados (PostgreSQL).

---

## 2. O que o sistema protege e garante por design?

### A. Separação Física: Quem avaliou vs. O que foi dito
A arquitetura do banco de dados divide a operação em duas entidades isoladas:
1. **`Participacao`**: guarda apenas `(aluno, ciclo, vinculo)`. Serve estritamente para o sistema saber que aquele estudante já concluiu sua avaliação para aquela matéria, evitando avaliações duplicadas e permitindo saber se a turma atingiu o engajamento esperado. **Não guarda nenhuma resposta nem conteúdo.**
2. **`Avaliacao`**: identificada por um `UUID` único aleatório, armazena as notas e respostas. **Não possui Foreign Key, chave estrangeira, hash, ID nem qualquer ligação direta ou indireta com o aluno.**

Ambos os registros são processados na mesma transação atômica (`transaction.atomic`), mas gravados em tabelas desacopladas.

### B. Ausência Total de Data e Hora nas Respostas
Nem a tabela `Avaliacao`, nem as respostas numéricas (`RespostaEscala`), nem os comentários (`RespostaTexto`) possuem campos de timestamp (`created_at`, `updated_at` ou data/hora). Isso impede ataques de correlação temporal (por exemplo: deduzir quem avaliou comparando o horário de envio com o horário de acesso do aluno).

### C. Limiar Mínimo Pedagógico (Padrão: 5 avaliações)
Nenhum professor ou membro da equipe tem acesso a dados de uma turma enquanto ela não acumular pelo menos **5 avaliações concluídas** (`n_avaliacoes >= escola.limiar_minimo`). Se uma turma tiver menos avaliações, o relatório permanece bloqueado para impedir que o professor adivinhe quem respondeu.

### D. Comentários Textuais Embaralhados e Moderados
Os comentários livres enviados pelos alunos:
- Nunca chegam ao professor com datas ou em ordem cronológica de envio: são sempre entregues em **ordem aleatória** (`shuffle`).
- Passam por moderação prévia da coordenação para barrar ofensas pessoais, linguagem abusiva ou informações que quebrem o anonimato acidentalmente.

### E. Inexistência de Rankings
O sistema **não implementa nem fornece APIs de ranking**, "melhores professores" ou "classificação punitiva". Os dados visam exclusivamente o desenvolvimento formativo e a autoavaliação dos educadores.

### F. Ausência de Logs de Requisição e Endereço IP
As rotas de envio de avaliação não registram o corpo da requisição (`payload`) nos logs de aplicação, e o endereço IP do usuário **nunca** é gravado no banco de dados junto das respostas.

---

## 3. Limites honestos da proteção: o que o aluno deve saber

Embora o sistema garanta o anonimato nos níveis de infraestrutura, código e banco de dados, existem limites práticos que dependem do comportamento do próprio usuário:

1. **Autoidentificação no texto livre**: se o aluno escrever detalhes específicos que só ele viveu (por exemplo: *"Professor, sou o aluno que quebrou o braço na aula de terça"*), o professor poderá deduzir sua identidade pelo contexto do relato.
2. **Estilo de escrita muito característico**: expressões idiomáticas raras, erros ortográficos específicos ou jargões familiares podem denunciar a autoria.
3. **Turmas com amostra muito reduzida**: em turmas excepcionalmente pequenas onde apenas o limiar mínimo de alunos avaliou, o professor pode tentar supor com base em interações em sala, embora o sistema faça o melhor para ocultar detalhes.
4. **Dispositivos compartilhados**: se o aluno esquecer sua conta conectada em computadores de uso comunitário da escola, outros poderão ver se ele já concluiu as avaliações.

---

## Resumo para o Aluno

> **Suas respostas numéricas e comentários nunca serão associados ao seu nome pelo sistema.** Nem o professor, nem a coordenação têm um botão ou consulta para ver quem deu qual nota. Seja respeitoso, construtivo e sincero!
