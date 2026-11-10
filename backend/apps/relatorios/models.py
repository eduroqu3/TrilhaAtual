from django.db import models


class ResumoVinculo(models.Model):
    """
    Guarda o resultado consolidado do ciclo avaliativo para um determinado vínculo.
    Só é gerado/exibido quando n_avaliacoes >= escola.limiar_minimo.
    """

    ciclo = models.ForeignKey(
        "avaliacoes.CicloAvaliacao",
        on_delete=models.CASCADE,
        related_name="resumos_vinculo",
    )
    vinculo = models.ForeignKey(
        "escolas.Vinculo",
        on_delete=models.CASCADE,
        related_name="resumos_vinculo",
    )
    n_avaliacoes = models.PositiveIntegerField(
        help_text="Total de avaliações recebidas por este vínculo no ciclo",
    )
    medias_por_dimensao = models.JSONField(
        default=dict,
        help_text="Dicionário com a média de pontuação por dimensão pedagógica",
    )
    media_geral = models.FloatField(
        default=0.0,
        help_text="Média global das respostas numéricas",
    )
    limiar_atingido = models.BooleanField(
        default=False,
        help_text="Indica se atingiu o limiar mínimo exigido pela escola",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("ciclo", "vinculo")

    def __str__(self):
        return f"Resumo {self.ciclo.nome} - {self.vinculo} (n={self.n_avaliacoes})"
