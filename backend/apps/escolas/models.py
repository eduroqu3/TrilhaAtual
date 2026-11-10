from django.conf import settings
from django.db import models


class Escola(models.Model):
    nome = models.CharField(max_length=255)
    limiar_minimo = models.PositiveIntegerField(
        default=5,
        help_text="Número mínimo de avaliações para exibir resultados",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome


class Turma(models.Model):
    escola = models.ForeignKey(
        Escola,
        on_delete=models.CASCADE,
        related_name="turmas",
    )
    nome = models.CharField(max_length=100)
    ano_letivo = models.PositiveIntegerField(default=2026)

    class Meta:
        unique_together = ("escola", "nome", "ano_letivo")

    def __str__(self):
        return f"{self.nome} ({self.ano_letivo}) - {self.escola.nome}"


class Disciplina(models.Model):
    escola = models.ForeignKey(
        Escola,
        on_delete=models.CASCADE,
        related_name="disciplinas",
    )
    nome = models.CharField(max_length=150)
    codigo = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = ("escola", "nome")

    def __str__(self):
        return f"{self.nome} - {self.escola.nome}"


class Matricula(models.Model):
    aluno = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matriculas",
        limit_choices_to={"role": "ALUNO"},
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.CASCADE,
        related_name="matriculas",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("aluno", "turma")

    def __str__(self):
        return f"{self.aluno.username} -> {self.turma.nome}"


class Vinculo(models.Model):
    professor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="vinculos",
        limit_choices_to={"role": "PROFESSOR"},
    )
    turma = models.ForeignKey(
        Turma,
        on_delete=models.CASCADE,
        related_name="vinculos",
    )
    disciplina = models.ForeignKey(
        Disciplina,
        on_delete=models.CASCADE,
        related_name="vinculos",
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        unique_together = ("professor", "turma", "disciplina")

    def __str__(self):
        prof = self.professor.get_full_name() or self.professor.username
        return f"{prof} | {self.disciplina.nome} ({self.turma.nome})"
