from django.urls import path

from apps.avaliacoes.views import (
    AlunoEnviarAvaliacaoView,
    AlunoPendenciasView,
    AlunoQuestionarioView,
)

urlpatterns = [
    path("aluno/pendencias/", AlunoPendenciasView.as_view(), name="aluno-pendencias"),
    path(
        "aluno/ciclos/<int:ciclo_id>/vinculos/<int:vinculo_id>/questionario/",
        AlunoQuestionarioView.as_view(),
        name="aluno-questionario",
    ),
    path("aluno/avaliacoes/", AlunoEnviarAvaliacaoView.as_view(), name="aluno-enviar-avaliacao"),
]
