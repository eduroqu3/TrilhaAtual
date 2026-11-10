from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class RoleChoices(models.TextChoices):
    ALUNO = "ALUNO", "Aluno"
    PROFESSOR = "PROFESSOR", "Professor"
    COORDENACAO = "COORDENACAO", "Coordenação"
    ADMIN = "ADMIN", "Administrador"


class Usuario(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.ALUNO,
    )
    escola = models.ForeignKey(
        "escolas.Escola",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="usuarios",
    )

    def clean(self):
        super().clean()
        if self.role != RoleChoices.ADMIN and not self.escola:
            msg = "A escola é obrigatória para usuários que não são ADMIN."
            raise ValidationError({"escola": msg})

    def __str__(self):
        return f"{self.username} ({self.role})"
