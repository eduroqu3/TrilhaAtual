import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CicloStatus(models.TextChoices):
    RASCUNHO = "RASCUNHO", "Rascunho"
    ABERTO = "ABERTO", "Aberto"
    FECHADO = "FECHADO", "Fechado"
    PUBLICADO = "PUBLICADO", "Publicado"


class PerguntaTipo(models.TextChoices):
    ESCALA_1_5 = "ESCALA_1_5", "Escala de 1 a 5"
    TEXTO = "TEXTO", "Texto Livre"


class ModeracaoStatus(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"


class CicloAvaliacao(models.Model):
    escola = models.ForeignKey(
        "escolas.Escola",
        on_delete=models.CASCADE,
        related_name="ciclos_avaliacao",
    )
    nome = models.CharField(max_length=200)
    abre_em = models.DateTimeField()
    fecha_em = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=CicloStatus.choices,
        default=CicloStatus.RASCUNHO,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nome} ({self.status}) - {self.escola.nome}"


class Pergunta(models.Model):
    ciclo = models.ForeignKey(
        CicloAvaliacao,
        on_delete=models.CASCADE,
        related_name="perguntas",
    )
    texto = models.TextField()
    tipo = models.CharField(
        max_length=20,
        choices=PerguntaTipo.choices,
        default=PerguntaTipo.ESCALA_1_5,
    )
    dimensao = models.CharField(
        max_length=100,
        help_text="Ex: Clareza Didática, Empatia, Pontualidade",
    )
    ordem = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["ordem", "id"]

    def __str__(self):
        return f"[{self.dimensao}] {self.texto[:50]}"


class Participacao(models.Model):
    """
    REGRA INEGOCIÁVEL, ANONIMATO POR ARQUITETURA:
    Registra QUEM já avaliou para evitar duplicidades e saber pendências.
    NÃO guarda conteúdo.
    """

    aluno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="participacoes",
        limit_choices_to={"role": "ALUNO"},
    )
    ciclo = models.ForeignKey(
        CicloAvaliacao,
        on_delete=models.CASCADE,
        related_name="participacoes",
    )
    vinculo = models.ForeignKey(
        "escolas.Vinculo",
        on_delete=models.CASCADE,
        related_name="participacoes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("aluno", "ciclo", "vinculo")

    def __str__(self):
        return f"Participacao aluno={self.aluno_id} ciclo={self.ciclo_id} vinculo={self.vinculo_id}"


class Avaliacao(models.Model):
    """
    REGRA INEGOCIÁVEL, ANONIMATO POR ARQUITETURA:
    Guarda O QUÊ foi avaliado.
    - Id UUID
    - Ciclo e Vínculo
    - NUNCA tem FK, hash ou chave comum com o aluno
    - NUNCA tem created_at ou qualquer campo timestamp/data/hora
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ciclo = models.ForeignKey(
        CicloAvaliacao,
        on_delete=models.CASCADE,
        related_name="avaliacoes",
    )
    vinculo = models.ForeignKey(
        "escolas.Vinculo",
        on_delete=models.CASCADE,
        related_name="avaliacoes",
    )

    def __str__(self):
        return f"Avaliacao {self.id} ciclo={self.ciclo_id} vinculo={self.vinculo_id}"


class RespostaEscala(models.Model):
    """
    Resposta numérica (1 a 5) associada estritamente à Avaliacao.
    Sem FK de usuário e sem data/hora.
    """

    avaliacao = models.ForeignKey(
        Avaliacao,
        on_delete=models.CASCADE,
        related_name="respostas_escala",
    )
    pergunta = models.ForeignKey(
        Pergunta,
        on_delete=models.CASCADE,
        related_name="respostas_escala",
    )
    valor = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )

    class Meta:
        unique_together = ("avaliacao", "pergunta")

    def __str__(self):
        return f"Escala {self.valor} (Pergunta {self.pergunta_id})"


class RespostaTexto(models.Model):
    """
    Resposta textual qualitativa associada estritamente à Avaliacao.
    Sem FK de usuário e sem data/hora.
    """

    avaliacao = models.ForeignKey(
        Avaliacao,
        on_delete=models.CASCADE,
        related_name="respostas_texto",
    )
    pergunta = models.ForeignKey(
        Pergunta,
        on_delete=models.CASCADE,
        related_name="respostas_texto",
    )
    texto = models.TextField()
    status_moderacao = models.CharField(
        max_length=20,
        choices=ModeracaoStatus.choices,
        default=ModeracaoStatus.PENDENTE,
    )

    class Meta:
        unique_together = ("avaliacao", "pergunta")

    def __str__(self):
        return f"Texto [{self.status_moderacao}] (Pergunta {self.pergunta_id})"
